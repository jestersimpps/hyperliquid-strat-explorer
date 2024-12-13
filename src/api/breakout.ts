import { EventEmitter } from "events";
import { BreakoutSignal, WsCandle } from "../types/websocket";

export class BreakoutDetector extends EventEmitter {
  private resistanceLevels: Map<string, number[]> = new Map();
  private supportLevels: Map<string, number[]> = new Map();
  private recentVolumes: Map<string, number[]> = new Map();
  private volumeWindow = 20; // periods to calculate average volume

  constructor() {
    super();
  }

  public addLevel(coin: string, price: number, type: 'resistance' | 'support'): void {
    const levels = type === 'resistance' ? this.resistanceLevels : this.supportLevels;
    if (!levels.has(coin)) {
      levels.set(coin, []);
    }
    levels.get(coin)!.push(price);
  }

  public processCandle(candle: WsCandle): void {
    const coin = candle.s;
    
    // Update volume history
    if (!this.recentVolumes.has(coin)) {
      this.recentVolumes.set(coin, []);
    }
    const volumes = this.recentVolumes.get(coin)!;
    volumes.push(candle.v);
    if (volumes.length > this.volumeWindow) {
      volumes.shift();
    }

    // Calculate average volume
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    // Check resistance breakouts
    const resistances = this.resistanceLevels.get(coin) || [];
    for (const resistance of resistances) {
      if (candle.c > resistance && candle.v > avgVolume * 1.5) { // 50% above average volume
        const signal: BreakoutSignal = {
          type: 'resistance',
          price: candle.c,
          volume: candle.v,
          timestamp: candle.t,
          confirmed: true
        };
        this.emit('breakout', signal);
      }
    }

    // Check support breakouts
    const supports = this.supportLevels.get(coin) || [];
    for (const support of supports) {
      if (candle.c < support && candle.v > avgVolume * 1.5) {
        const signal: BreakoutSignal = {
          type: 'support', 
          price: candle.c,
          volume: candle.v,
          timestamp: candle.t,
          confirmed: true
        };
        this.emit('breakout', signal);
      }
    }
  }

  public clearLevels(coin: string): void {
    this.resistanceLevels.delete(coin);
    this.supportLevels.delete(coin);
  }
}
