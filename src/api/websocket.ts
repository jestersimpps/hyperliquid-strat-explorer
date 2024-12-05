import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { WsSubscription, WsMessage } from '../types/websocket';

const WS_URL = process.env.WS_URL || 'wss://api.hyperliquid.xyz/ws';

export class HyperliquidWebSocketAPI extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    super();
    this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.resubscribe();
        resolve();
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: WsMessage = JSON.parse(data.toString());
        this.emit(message.channel, message.data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.handleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  private resubscribe() {
    for (const subscription of this.subscriptions) {
      const parsed = JSON.parse(subscription);
      this.sendMessage(parsed);
    }
  }

  private async sendMessage(message: WsSubscription) {
    await this.connect();
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  async subscribe(subscription: Omit<WsSubscription['subscription'], 'method'>) {
    const message: WsSubscription = {
      method: 'subscribe',
      subscription
    };
    
    this.subscriptions.add(JSON.stringify(message));
    await this.sendMessage(message);
  }

  unsubscribe(subscription: Omit<WsSubscription['subscription'], 'method'>) {
    const message: WsSubscription = {
      method: 'unsubscribe',
      subscription
    };
    
    this.subscriptions.delete(JSON.stringify({ method: 'subscribe', subscription }));
    this.sendMessage(message);
  }

  // Convenience methods for common subscriptions
  async subscribeToAllMids(callback: (data: any) => void) {
    await this.subscribe({ type: 'allMids' });
    this.on('allMids', callback);
  }

  async subscribeToTrades(coin: string, callback: (data: any) => void) {
    await this.subscribe({ type: 'trades', coin });
    this.on('trades', callback);
  }

  async subscribeToOrderBook(coin: string, callback: (data: any) => void) {
    await this.subscribe({ type: 'l2Book', coin });
    this.on('l2Book', callback);
  }

  async subscribeToUserOrders(userAddress: string, callback: (data: any) => void) {
    await this.subscribe({ type: 'orderUpdates', user: userAddress });
    this.on('orderUpdates', callback);
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}
