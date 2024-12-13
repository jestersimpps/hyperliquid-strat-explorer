export interface Line {
  start: { x: number; y: number };
  end: { x: number; y: number };
  strength: number;
}

export type SignalType = 'RESISTANCE_BREAK' | 'SUPPORT_BREAK' | 'AT_RESISTANCE' | 'AT_SUPPORT';

export interface BreakoutSignal {
  type: SignalType;
  price: number;
  timestamp: number;
  confidence: number;  // 0-1 score based on confirmation factors
  confirmations: {
    volumeIncrease: number;      // Volume compared to average
    priceAction: boolean;        // Candle closed beyond S/R
    trendAlignment: boolean;     // Aligned with larger timeframe trend
    falseBreakoutCheck: boolean; // Price stayed beyond S/R
    multiTimeframe: boolean;     // Confirmed on multiple timeframes
    volatilityCheck: boolean;    // Sufficient market volatility
    timeElapsed: number;         // Time since breakout in ms
    volatilityCheck: boolean;    // Sufficient market volatility
    timeElapsed: number;         // Time since breakout in ms
  };
}
