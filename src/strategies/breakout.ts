import { WsCandle } from '../types/websocket';
import { detectSupportResistance } from '../utils/support-resistance';

export class BreakoutStrategy {
  private readonly volumeConfirmationThreshold = 1.5; // 150% of average volume
  private readonly lookbackPeriod = 20; // Number of candles to look back for patterns
  private readonly chunkSize = 10; // Size of chunks for support/resistance detection

  constructor() {
    // Initialize strategy
  }

  public analyzeTrendlines(candles: WsCandle[]) {
    return detectSupportResistance(candles, this.chunkSize);
  }
}
