import { WsCandle } from "../types/websocket";
import { detectSupportResistance } from "../utils/support-resistance";

export class BreakoutStrategy {
 constructor() {
  // Initialize strategy
 }

 public analyzeTrendlines(candles: WsCandle[]) {
  return detectSupportResistance(candles);
 }
}
