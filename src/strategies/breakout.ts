import { WsCandle } from "../types/websocket";
import { BreakoutSignal, SignalType } from "../types/breakout";
import { detectSupportResistance } from "../utils/support-resistance";
import { Line } from "../utils/support-resistance";

export class BreakoutStrategy {
  private readonly volumeThreshold = 1.5; // 150% of average volume
  private breakoutTimestamps: Map<string, number> = new Map(); // Store breakout timestamps

  constructor() {
    // Initialize strategy
  }

  private calculateAverageVolume(candles: WsCandle[], periods: number = 20): number {
    const recentCandles = candles.slice(-periods);
    return recentCandles.reduce((sum, candle) => sum + parseFloat(candle.v), 0) / periods;
  }

  private checkVolumeConfirmation(currentVolume: number, averageVolume: number): boolean {
    return currentVolume > (averageVolume * this.volumeThreshold);
  }

  private checkPriceAction(candle: WsCandle, level: number, type: SignalType): boolean {
    const close = parseFloat(candle.c);
    return type === 'RESISTANCE_BREAK' ? 
      close > level :
      close < level;
  }

  private detectTrend(candles: WsCandle[], periods: number = 20): 'UP' | 'DOWN' | 'SIDEWAYS' {
    const prices = candles.slice(-periods).map(c => parseFloat(c.c));
    const firstAvg = prices.slice(0, Math.floor(periods/2)).reduce((a, b) => a + b) / Math.floor(periods/2);
    const secondAvg = prices.slice(-Math.floor(periods/2)).reduce((a, b) => a + b) / Math.floor(periods/2);
    
    const difference = secondAvg - firstAvg;
    if (Math.abs(difference) < firstAvg * 0.01) return 'SIDEWAYS';
    return difference > 0 ? 'UP' : 'DOWN';
  }

  private getIntervalMs(interval: string): number {
    const value = parseInt(interval.slice(0, -1));
    const unit = interval.slice(-1);
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // default 15min
    }
  }

  private checkFalseBreakout(
    candles: WsCandle[], 
    breakoutCandle: WsCandle, 
    level: number, 
    type: SignalType
  ): boolean {
    // Use 3 candle intervals as minimum confirmation time
    const minConfirmationTime = this.getIntervalMs(breakoutCandle.i) * 3;
    const subsequentCandles = candles.slice(
      candles.findIndex(c => c.t === breakoutCandle.t) + 1
    );

    // Check if enough time has passed
    const timeElapsed = subsequentCandles.length > 0 ? 
      subsequentCandles[subsequentCandles.length - 1].t - breakoutCandle.t : 0;
    
    if (timeElapsed < minConfirmationTime) {
      return false;
    }

    // Check if price stayed beyond the level
    return subsequentCandles.every(candle => {
      const close = parseFloat(candle.c);
      return type === 'RESISTANCE_BREAK' ? close > level : close < level;
    });
  }

  private calculateATR(candles: WsCandle[]): number {
    let sum = 0;
    for (let i = 1; i < candles.length; i++) {
      const high = parseFloat(candles[i].h);
      const low = parseFloat(candles[i].l);
      const prevClose = parseFloat(candles[i-1].c);
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      sum += tr;
    }
    return sum / candles.length;
  }

  private checkVolatility(candles: WsCandle[], periods: number = 20): boolean {
    const atr = this.calculateATR(candles.slice(-periods));
    const currentPrice = parseFloat(candles[candles.length - 1].c);
    const volatilityThreshold = currentPrice * 0.005; // 0.5% of price
    
    return atr > volatilityThreshold;
  }

  public detectBreakout(symbol: string, candles: WsCandle[]): BreakoutSignal | null {
    if (candles.length < 20) return null;

    const { support, resistance } = this.analyzeTrendlines(candles);
    const currentCandle = candles[candles.length - 1];
    const currentPrice = parseFloat(currentCandle.c);
    const currentVolume = parseFloat(currentCandle.v);
    const avgVolume = this.calculateAverageVolume(candles);
    const trend = this.detectTrend(candles);

    // Check for breakout
    let breakoutType: SignalType | null = null;
    let level = 0;

    const resistanceLevel = resistance.end.y;
    const supportLevel = support.end.y;
    const priceThreshold = Math.abs(resistanceLevel - supportLevel) * 0.01; // 1% threshold

    if (currentPrice > resistanceLevel) {
      breakoutType = 'RESISTANCE_BREAK';
      level = resistanceLevel;
    } else if (currentPrice < supportLevel) {
      breakoutType = 'SUPPORT_BREAK';
      level = supportLevel;
    } else if (Math.abs(currentPrice - resistanceLevel) <= priceThreshold) {
      breakoutType = 'AT_RESISTANCE';
      level = resistanceLevel;
    } else if (Math.abs(currentPrice - supportLevel) <= priceThreshold) {
      breakoutType = 'AT_SUPPORT';
      level = supportLevel;
    }

    if (!breakoutType) return null;

    // Validate breakout                           
    const volumeConfirmation = this.checkVolumeConfirmation(currentVolume, avgVolume);
    const priceActionConfirmation = this.checkPriceAction(currentCandle, level, breakoutType);
    const trendAlignmentConfirmation = (
      (breakoutType === 'RESISTANCE_BREAK' && trend === 'UP') ||
      (breakoutType === 'SUPPORT_BREAK' && trend === 'DOWN')
    );
    const falseBreakoutConfirmation = breakoutType === 'RESISTANCE_BREAK' || breakoutType === 'SUPPORT_BREAK' 
      ? this.checkFalseBreakout(candles, currentCandle, level, breakoutType)
      : false;

    // Calculate confidence score
    const volatilityConfirmation = this.checkVolatility(candles);
    // Calculate or get initial breakout timestamp
    const breakoutKey = `${breakoutType}-${symbol}`;
    if (!this.breakoutTimestamps.has(breakoutKey)) {
      this.breakoutTimestamps.set(breakoutKey, currentCandle.t);
    }
    const initialBreakoutTime = this.breakoutTimestamps.get(breakoutKey)!;
    const timeElapsed = currentCandle.t - initialBreakoutTime;

    const confirmations = {
      volumeIncrease: currentVolume / avgVolume,
      volumeConfirmation: volumeConfirmation,
      priceAction: priceActionConfirmation,
      trendAlignment: trendAlignmentConfirmation,
      falseBreakoutCheck: falseBreakoutConfirmation,
      volatilityCheck: volatilityConfirmation,
      timeElapsed: timeElapsed
    };

    const confidence = Object.values(confirmations).filter(Boolean).length / 7;

    // Clear breakout timestamp if confidence drops too low
    if (confidence < 0.3) {
      this.breakoutTimestamps.delete(breakoutKey);
      return null;
    }

    if (confidence >= 0.5) {  // Require at least 10% confidence
      return {
        type: breakoutType,
        price: currentPrice,
        timestamp: currentCandle.t,
        confidence,
        confirmations
      };
    }

    return null;
  }

  public analyzeTrendlines(candles: WsCandle[]): { support: Line; resistance: Line } {
    if (candles.length < 50) {
      return detectSupportResistance(candles);
    }

    // Keep minimum of latest 50 candles
    const minCandles = 50;
    
    // Start with full array and decrease size
    let bestSupport = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, strength: 0 };
    let bestResistance = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, strength: 0 };

    for (let size = candles.length; size >= minCandles; size -= 10) {
      const subset = candles.slice(-size);
      const { support, resistance } = detectSupportResistance(subset);

      // Update if stronger levels found
      if (support.strength > bestSupport.strength) {
        bestSupport = support;
      }
      if (resistance.strength > bestResistance.strength) {
        bestResistance = resistance;
      }
    }

    return {
      support: bestSupport,
      resistance: bestResistance
    };
  }
}
