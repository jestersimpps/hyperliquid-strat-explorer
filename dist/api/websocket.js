"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperliquidWebSocketAPI = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class HyperliquidWebSocketAPI extends events_1.EventEmitter {
    ws = null;
    subscriptions = new Set();
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    pingInterval;
    WS_URL = "wss://api.hyperliquid.xyz/ws";
    candleArrays = new Map();
    candleRefreshTimers = new Map();
    infoApi;
    constructor(infoApi) {
        super();
        this.infoApi = infoApi;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.WS_URL);
                this.ws.on("open", () => {
                    console.log("WebSocket connected");
                    this.reconnectAttempts = 0;
                    this.setupPingInterval();
                    this.resubscribeAll();
                    resolve();
                });
                this.ws.on("message", (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error("WebSocket message:", data.toString());
                        console.error("Parse error:", error);
                    }
                });
                this.ws.on("close", () => {
                    console.log("WebSocket disconnected");
                    this.cleanup();
                    this.handleReconnect();
                });
                this.ws.on("error", (error) => {
                    console.error("WebSocket error:", error);
                    this.cleanup();
                    reject(error);
                });
            }
            catch (error) {
                console.error("Connection error:", error);
                reject(error);
            }
        });
    }
    async resubscribeAll() {
        for (const subKey of this.subscriptions) {
            const [type, coin] = subKey.split(":");
            await this.subscribe(type, coin);
        }
    }
    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnection attempts reached");
            this.emit("maxReconnectAttemptsReached");
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                console.error("Reconnection failed:", error);
                this.handleReconnect();
            }
        }, delay);
    }
    formatSubscriptionMessage(type, coin, interval) {
        const subscription = {
            method: "subscribe",
            subscription: {
                type: type,
            },
        };
        if (coin) {
            subscription.subscription.coin = coin;
        }
        if (interval) {
            subscription.subscription.interval = interval;
        }
        return subscription;
    }
    setupPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === ws_1.default.OPEN) {
                this.ws.ping();
            }
        }, 30000);
    }
    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        // Clear all candle refresh timers
        for (const timer of this.candleRefreshTimers.values()) {
            clearInterval(timer);
        }
        this.candleRefreshTimers.clear();
    }
    async refreshCandleData(coin, interval, lookbackMs) {
        const key = this.getCandleKey(coin, interval);
        const startTime = Date.now() - lookbackMs;
        const newCandles = await this.infoApi.getCandles(coin, interval, startTime);
        this.candleArrays.set(key, newCandles);
        this.emit("candles", { coin, interval, candles: newCandles });
    }
    shouldRefreshCandles(candle) {
        return candle.n === 1; // Trades reset to 1 indicates a new candle
    }
    handleMessage(message) {
        if (!message.channel || !message.data) {
            console.warn("Received malformed message:", message);
            return;
        }
        switch (message.channel) {
            case "l2Book":
                this.emit("l2Book", message.data);
                break;
            case "trades":
                this.emit("trades", message.data);
                break;
            case "fills":
                this.emit("fills", message.data);
                break;
            case "userFunding":
                this.emit("userFunding", message.data);
                break;
            case "liquidations":
                this.emit("liquidations", message.data);
                break;
            case "orders":
                this.emit("orders", message.data);
                break;
            case "candle":
                if (Array.isArray(message.data)) {
                    const candles = message.data;
                    candles.forEach((candle) => this.updateCandle(candle));
                }
                else {
                    this.updateCandle(message.data);
                }
                break;
            default:
        }
    }
    getSubscriptionKey(type, coin) {
        return `${type}:${coin || ""}`;
    }
    async subscribe(type, coin, interval) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
            await this.connect();
        }
        const subKey = this.getSubscriptionKey(type, coin);
        if (this.subscriptions.has(subKey)) {
            console.log(`Already subscribed to: ${type} ${coin || ""}`);
            return;
        }
        return new Promise((resolve, reject) => {
            try {
                const message = this.formatSubscriptionMessage(type, coin, interval);
                this.ws.send(JSON.stringify(message));
                this.subscriptions.add(subKey);
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async subscribeToTicker(coin, callback) {
        this.on("l2Book", callback);
        await this.subscribe("l2Book", coin);
    }
    async subscribeToTrades(coin, callback) {
        this.on("trades", callback);
        await this.subscribe("trades", coin);
    }
    async subscribeToUserFills(callback) {
        this.on("fills", callback);
        await this.subscribe("fills");
    }
    async subscribeToUserFunding(callback) {
        this.on("userFunding", callback);
        await this.subscribe("userFunding");
    }
    async subscribeToLiquidations(callback) {
        this.on("liquidations", callback);
        await this.subscribe("liquidations");
    }
    async subscribeToOrders(callback) {
        this.on("orders", callback);
        await this.subscribe("orders");
    }
    getCandleKey(coin, interval) {
        return `${coin}:${interval}`;
    }
    updateCandle(candle) {
        const key = this.getCandleKey(candle.s, candle.i);
        const candles = this.candleArrays.get(key);
        if (!candles)
            return;
        // Check if we need to refresh the candle data
        if (this.shouldRefreshCandles(candle)) {
            this.refreshCandleData(candle.s, candle.i, 60 * 60 * 1000).catch((error) => {
                console.error("Error refreshing candle data:", error);
            });
            return;
        }
        // Find and update or append the candle
        const index = candles.findIndex((c) => c.t === candle.t);
        if (index !== -1) {
            candles[index] = candle;
        }
        else {
            candles.push(candle);
        }
        // Sort by timestamp and emit the full array
        candles.sort((a, b) => a.t - b.t);
        this.emit("candles", { coin: candle.s, interval: candle.i, candles });
    }
    async subscribeToCandles(coin, interval, lookbackMs, callback) {
        // Fetch initial candles
        await this.refreshCandleData(coin, interval, lookbackMs);
        // Set up the callback
        this.on("candles", callback);
        // Subscribe to live updates
        await this.subscribe("candle", coin, interval);
    }
    close() {
        this.cleanup();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
exports.HyperliquidWebSocketAPI = HyperliquidWebSocketAPI;
