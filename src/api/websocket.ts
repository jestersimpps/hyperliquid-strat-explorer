import WebSocket from "ws";
import { EventEmitter } from "events";

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

 private formatSubscriptionMessage(type: string, coin?: string): any {
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

 private handleMessage(message: any): void {
  if (message.channel) {
   this.emit(message.channel, message.data);
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
  callback: (ticker: any) => void
 ): Promise<void> {
  this.on(`l2Book`, callback); // Changed to l2Book
  await this.subscribe("ticker", coin);
 }

 public close(): void {
  this.cleanup();
  if (this.ws) {
   this.ws.close();
   this.ws = null;
  }
 }
}
