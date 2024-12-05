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
    constructor() {
        super();
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
                        console.log("Received message:", message); // Debug log
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
    formatSubscriptionMessage(type, coin) {
        switch (type) {
            case "ticker":
                return {
                    type: "subscribe",
                    channel: "l2Book",
                    coin: coin,
                };
            default:
                throw new Error(`Unknown subscription type: ${type}`);
        }
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
    }
    handleMessage(message) {
        if (message.channel) {
            this.emit(message.channel, message.data);
        }
    }
    getSubscriptionKey(type, coin) {
        return `${type}:${coin || ""}`;
    }
    async subscribe(type, coin) {
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
                const message = this.formatSubscriptionMessage(type, coin);
                console.log("Sending subscription:", message); // Debug log
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
        this.on(`l2Book`, callback); // Changed to l2Book
        await this.subscribe("ticker", coin);
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
