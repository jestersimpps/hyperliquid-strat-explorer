export interface BreakoutSignal {
  type: 'RESISTANCE_BREAK' | 'SUPPORT_BREAK';
  price: number;
  timestamp: number;
  confidence: number;  // 0-1 score based on confirmation factors
  confirmations: {
    volumeIncrease: number;      // Volume compared to average
    priceAction: boolean;        // Candle closed beyond S/R
    trendAlignment: boolean;     // Aligned with larger timeframe trend
    falseBreakoutCheck: boolean; // Price stayed beyond S/R
    multiTimeframe: boolean;     // Confirmed on multiple timeframes
  };
}