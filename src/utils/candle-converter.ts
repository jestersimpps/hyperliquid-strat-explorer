import { Candle as WsCandle } from '../types/websocket';

// Base candle interface used throughout the application
export interface Candle {
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

/**
 * Convert WebSocket candle to internal Candle format
 */
export function convertWsCandle(wsCandle: WsCandle): Candle {
  return {
    high: parseFloat(wsCandle.h),
    low: parseFloat(wsCandle.l),
    open: parseFloat(wsCandle.o),
    close: parseFloat(wsCandle.c),
    timestamp: wsCandle.t
  };
}

/**
 * Convert array of WebSocket candles to internal Candle format
 */
export function convertWsCandles(wsCandles: WsCandle[]): Candle[] {
  return wsCandles.map(convertWsCandle);
}

/**
 * Convert candles to technical indicators format
 */
export function convertToTechnicalFormat(candles: Candle[]): {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
} {
  return {
    open: candles.map((c) => c.open),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    volume: new Array(candles.length).fill(0), // Required by the library but not used for pattern detection
  };
}
