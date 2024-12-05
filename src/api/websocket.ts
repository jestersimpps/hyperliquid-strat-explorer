import WebSocket from "ws";
import { EventEmitter } from "events";
import { 
  WsMessage, 
  WsSubscription, 
  WsBook, 
  WsTrade,
  WsFill,
  WsUserFunding,
  WsLiquidation,
  WsOrder
} from "../types/websocket";

export class HyperliquidWebSocketAPI extends EventEmitter {
 private ws: WebSocket | null = null;
 private subscriptions: Set<string> = new Set();
 private reconnectAttempts = 0;
 private maxReconnectAttempts = 5;
 private reconnectDelay = 1000;
 private pingInterval?: NodeJS.Timeout;
 private readonly WS_URL = "wss://api.hyperliquid.xyz/ws";

 constructor() {
  super();
 }

 public async connect(): Promise<void> {
  return new Promise((resolve, reject) => {
   try {
    this.ws = new WebSocket(this.WS_URL);

    this.ws.on("open", () => {
     console.log("WebSocket connected");
     this.reconnectAttempts = 0;
     this.setupPingInterval();
     this.resubscribeAll();
     resolve();
    });

    this.ws.on("message", (data: WebSocket.Data) => {
     try {
      const message = JSON.parse(data.toString());
      console.log("Received message:", message); // Debug log
      this.handleMessage(message);
     } catch (error) {
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
   } catch (error) {
    console.error("Connection error:", error);
    reject(error);
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
   console.error("Max reconnection attempts reached");
   this.emit("maxReconnectAttemptsReached");
   return;
  }

  this.reconnectAttempts++;
  const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

  console.log(
   `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
  );

  setTimeout(async () => {
   try {
    await this.connect();
   } catch (error) {
    console.error("Reconnection failed:", error);
    this.handleReconnect();
   }
  }, delay);
 }

 private formatSubscriptionMessage(type: string, coin?: string): WsSubscription {
  const subscription: WsSubscription = {
    method: 'subscribe',
    subscription: {
      type: type,
    }
  };
  
  if (coin) {
    subscription.subscription.coin = coin;
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
 }

 private handleMessage(message: WsMessage): void {
  if (!message.channel || !message.data) {
    console.warn('Received malformed message:', message);
    return;
  }

  switch (message.channel) {
    case 'l2Book':
      this.emit('l2Book', message.data as WsBook);
      break;
    case 'trades':
      this.emit('trades', message.data as WsTrade);
      break;
    case 'fills':
      this.emit('fills', message.data as WsFill);
      break;
    case 'userFunding':
      this.emit('userFunding', message.data as WsUserFunding);
      break;
    case 'liquidations':
      this.emit('liquidations', message.data as WsLiquidation);
      break;
    case 'orders':
      this.emit('orders', message.data as WsOrder);
      break;
    default:
      console.warn('Unknown message channel:', message.channel);
  }
 }

 private getSubscriptionKey(type: string, coin?: string): string {
  return `${type}:${coin || ""}`;
 }

 private async subscribe(type: string, coin?: string): Promise<void> {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
  this.on('l2Book', callback);
  await this.subscribe('l2Book', coin);
 }

 public async subscribeToTrades(
  coin: string,
  callback: (trade: WsTrade) => void
 ): Promise<void> {
  this.on('trades', callback);
  await this.subscribe('trades', coin);
 }

 public async subscribeToUserFills(
  callback: (fill: WsFill) => void
 ): Promise<void> {
  this.on('fills', callback);
  await this.subscribe('fills');
 }

 public async subscribeToUserFunding(
  callback: (funding: WsUserFunding) => void
 ): Promise<void> {
  this.on('userFunding', callback);
  await this.subscribe('userFunding');
 }

 public async subscribeToLiquidations(
  callback: (liquidation: WsLiquidation) => void
 ): Promise<void> {
  this.on('liquidations', callback);
  await this.subscribe('liquidations');
 }

 public async subscribeToOrders(
  callback: (order: WsOrder) => void
 ): Promise<void> {
  this.on('orders', callback);
  await this.subscribe('orders');
 }

 public close(): void {
  this.cleanup();
  if (this.ws) {
   this.ws.close();
   this.ws = null;
  }
 }
}
