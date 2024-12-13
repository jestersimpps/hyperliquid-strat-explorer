import { WsCandle } from "../types/websocket";
import { detectSupportResistance } from "../utils/support-resistance";

export class BreakoutStrategy {
 private readonly chunkSize = 10; // Size of chunks for support/resistance detection

 constructor() {
  // Initialize strategy
 }

 public analyzeTrendlines(candles: WsCandle[]) {
  return detectSupportResistance(candles, this.chunkSize);
 }
}
