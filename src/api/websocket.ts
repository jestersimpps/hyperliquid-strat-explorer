import WebSocket from "ws";
import { EventEmitter } from "events";
import { HyperliquidInfoAPI } from "./info";
import {
 WsMessage,
 WsSubscription,
 WsBook,
 WsTrade,
 WsFill,
 WsUserFunding,
 WsLiquidation,
 WsOrder,
 WsCandle,
} from "../types/websocket";

export class HyperliquidWebSocketAPI extends EventEmitter {
 private ws: WebSocket | null = null;
 private subscriptions: Set<string> = new Set();
 private reconnectAttempts = 0;
 private maxReconnectAttempts = 5;
 private reconnectDelay = 1000;
 private pingInterval?: NodeJS.Timeout;
 private readonly WS_URL = "wss://api.hyperliquid.xyz/ws";
 private candleArrays: Map<string, WsCandle[]> = new Map();
 private candleRefreshTimers: Map<string, NodeJS.Timeout> = new Map();
 private infoApi: HyperliquidInfoAPI;

 constructor(infoApi: HyperliquidInfoAPI) {
  super();
  this.infoApi = infoApi;
 }

 public async connect(): Promise<void> {
  return new Promise((resolve, reject) => {
   try {
    this.ws = new WebSocket(this.WS_URL);

    this.ws.on("open", () => {
     this.emit('info', "WebSocket connected");
     this.reconnectAttempts = 0;
     this.setupPingInterval();
     this.resubscribeAll();
     resolve();
    });

    this.ws.on("message", (data: WebSocket.Data) => {
     try {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
     } catch (error) {
      this.emit('error', new Error(`Failed to parse WebSocket message: ${error instanceof Error ? error.message : String(error)}`));
     }
    });

    this.ws.on("close", () => {
     this.emit('info', "WebSocket disconnected");
     this.cleanup();
     this.handleReconnect();
    });

    this.ws.on("error", (error) => {
     const wsError = new Error(`WebSocket connection error: ${error instanceof Error ? error.message : String(error)}`);
     this.emit('error', wsError);
     this.cleanup();
     reject(wsError);
    });
   } catch (error) {
    const connError = new Error(`Failed to establish WebSocket connection: ${error instanceof Error ? error.message : String(error)}`);
    this.emit('error', connError);
    reject(connError);
   }
  });
 }

 private async resubscribeAll(): Promise<void> {
  for (const subKey of this.subscriptions) {
   const [type, coin] = subKey.split(":");
   await this.subscribe(type, coin);
  }
 }

 private async handleReconnect(): Promise<void> {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
   const error = new Error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
   this.emit('error', error);
   this.emit("maxReconnectAttemptsReached");
   return;
  }

  this.reconnectAttempts++;
  const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

  this.emit('info',
   `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
  );

  setTimeout(async () => {
   try {
    await this.connect();
   } catch (error) {
    this.emit('error', new Error(`Reconnection attempt failed: ${error instanceof Error ? error.message : String(error)}`));
    this.handleReconnect();
   }
  }, delay);
 }

 private formatSubscriptionMessage(
  type: string,
  coin?: string,
  interval?: string
 ): WsSubscription {
  const subscription: WsSubscription = {
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

 private setupPingInterval(): void {
  this.pingInterval = setInterval(() => {
   if (this.ws?.readyState === WebSocket.OPEN) {
    this.ws.ping();
   }
  }, 30000);
 }

 private cleanup(): void {
  if (this.pingInterval) {
   clearInterval(this.pingInterval);
  }
  // Clear all candle refresh timers
  for (const timer of this.candleRefreshTimers.values()) {
   clearInterval(timer);
  }
  this.candleRefreshTimers.clear();
 }

 private async refreshCandleData(
  coin: string,
  interval: string,
  lookbackMs: number
 ): Promise<void> {
  const key = this.getCandleKey(coin, interval);
  const startTime = Date.now() - lookbackMs;
  const newCandles = await this.infoApi.getCandles(coin, interval, startTime);

  this.candleArrays.set(key, newCandles);
  this.emit("candles", { coin, interval, candles: newCandles });
 }

 private shouldRefreshCandles(candle: WsCandle): boolean {
  return candle.n === 1; // Trades reset to 1 indicates a new candle
 }

 private handleMessage(message: WsMessage): void {
  if (!message.channel || !message.data) {
   this.emit('error', new Error(`Received malformed WebSocket message: ${JSON.stringify(message)}`));
   return;
  }

  switch (message.channel) {
   case "l2Book":
    this.emit("l2Book", message.data as WsBook);
    break;
   case "trades":
    this.emit("trades", message.data as WsTrade);
    break;
   case "fills":
    this.emit("fills", message.data as WsFill);
    break;
   case "userFunding":
    this.emit("userFunding", message.data as WsUserFunding);
    break;
   case "liquidations":
    this.emit("liquidations", message.data as WsLiquidation);
    break;
   case "orders":
    this.emit("orders", message.data as WsOrder);
    break;
   case "candle":
    if (Array.isArray(message.data)) {
     const candles = message.data as WsCandle[];
     candles.forEach((candle) => this.updateCandle(candle));
    } else {
     this.updateCandle(message.data as WsCandle);
    }
    break;
   default:
  }
 }

 private getSubscriptionKey(type: string, coin?: string): string {
  return `${type}:${coin || ""}`;
 }

 private async subscribe(
  type: string,
  coin?: string,
  interval?: string
 ): Promise<void> {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
   await this.connect();
  }

  const subKey = this.getSubscriptionKey(type, coin);
  if (this.subscriptions.has(subKey)) {
   this.emit('debug', `Already subscribed to: ${type} ${coin || ""}`);
   return;
  }

  return new Promise((resolve, reject) => {
   try {
    const message = this.formatSubscriptionMessage(type, coin, interval);
    this.ws!.send(JSON.stringify(message));
    this.subscriptions.add(subKey);
    resolve();
   } catch (error) {
    reject(error);
   }
  });
 }

 public async subscribeToTicker(
  coin: string,
  callback: (book: WsBook) => void
 ): Promise<void> {
  this.on("l2Book", callback);
  await this.subscribe("l2Book", coin);
 }

 public async subscribeToTrades(
  coin: string,
  callback: (trade: WsTrade) => void
 ): Promise<void> {
  this.on("trades", callback);
  await this.subscribe("trades", coin);
 }

 public async subscribeToUserFills(
  callback: (fill: WsFill) => void
 ): Promise<void> {
  this.on("fills", callback);
  await this.subscribe("fills");
 }

 public async subscribeToUserFunding(
  callback: (funding: WsUserFunding) => void
 ): Promise<void> {
  this.on("userFunding", callback);
  await this.subscribe("userFunding");
 }

 public async subscribeToLiquidations(
  callback: (liquidation: WsLiquidation) => void
 ): Promise<void> {
  this.on("liquidations", callback);
  await this.subscribe("liquidations");
 }

 public async subscribeToOrders(
  callback: (order: WsOrder) => void
 ): Promise<void> {
  this.on("orders", callback);
  await this.subscribe("orders");
 }

 private getCandleKey(coin: string, interval: string): string {
  return `${coin}:${interval}`;
 }

 private updateCandle(candle: WsCandle): void {
  const key = this.getCandleKey(candle.s, candle.i);
  const candles = this.candleArrays.get(key);

  if (!candles) return;

  // Check if we need to refresh the candle data
  if (this.shouldRefreshCandles(candle)) {
   this.refreshCandleData(candle.s, candle.i, 60 * 60 * 1000).catch((error) => {
    this.emit('error', new Error(`Failed to refresh candle data: ${error instanceof Error ? error.message : String(error)}`));
   });
   return;
  }

  // Find and update or append the candle
  const index = candles.findIndex((c) => c.t === candle.t);
  if (index !== -1) {
   candles[index] = candle;
  } else {
   candles.push(candle);
  }

  // Sort by timestamp and emit the full array
  candles.sort((a, b) => a.t - b.t);
  this.emit("candles", { coin: candle.s, interval: candle.i, candles });
 }

 public async subscribeToCandles(
  coin: string,
  interval: string,
  lookbackMs: number,
  callback: (update: {
   coin: string;
   interval: string;
   candles: WsCandle[];
  }) => void
 ): Promise<void> {
  // Fetch initial candles
  await this.refreshCandleData(coin, interval, lookbackMs);

  // Set up the callback
  this.on("candles", callback);

  // Subscribe to live updates
  await this.subscribe("candle", coin, interval);
 }

 public close(): void {
  this.cleanup();
  if (this.ws) {
   this.ws.close();
   this.ws = null;
  }
 }
}
