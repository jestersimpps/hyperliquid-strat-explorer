import { WsCandle } from "../types/websocket";
import { ProcessedCandle } from "../types/ui";

export function processCandles(candles: WsCandle[], maxCandles: number): WsCandle[] {
  if (!candles || candles.length === 0) return [];

  return candles
    .sort((a, b) => a.t - b.t)
    .slice(-maxCandles);
}

export function updateCandleHistory(
  history: WsCandle[],
  newCandles: WsCandle[],
  maxCandles: number
): WsCandle[] {
  let updatedHistory = [...history];

  for (const candle of newCandles) {
    const existingIndex = updatedHistory.findIndex(c => c.t === candle.t);
    if (existingIndex !== -1) {
      updatedHistory[existingIndex] = candle;
    } else {
      updatedHistory.push(candle);
    }
  }

  return processCandles(updatedHistory, maxCandles);
}

export function formatCandle(candle: WsCandle): ProcessedCandle {
  return {
    time: new Date(candle.t).toLocaleTimeString(),
    price: parseFloat(candle.c),
    volume: parseFloat(candle.v),
    timestamp: candle.t
  };
}

export function logCandleInfo(
  symbol: string,
  candle: WsCandle
): string {
  return `[${symbol}] ${new Date(candle.t).toLocaleTimeString()} | ` +
    `O: ${parseFloat(candle.o).toFixed(2)} | ` +
    `H: ${parseFloat(candle.h).toFixed(2)} | ` +
    `L: ${parseFloat(candle.l).toFixed(2)} | ` +
    `C: ${parseFloat(candle.c).toFixed(2)} | ` +
    `V: ${parseFloat(candle.v).toFixed(2)}`;
}
