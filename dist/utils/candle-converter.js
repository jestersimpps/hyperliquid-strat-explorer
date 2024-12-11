"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertWsCandle = convertWsCandle;
exports.convertWsCandles = convertWsCandles;
exports.convertToTechnicalFormat = convertToTechnicalFormat;
/**
 * Convert WebSocket candle to internal Candle format
 */
function convertWsCandle(wsCandle) {
    return {
        high: parseFloat(wsCandle.h),
        low: parseFloat(wsCandle.l),
        open: parseFloat(wsCandle.o),
        close: parseFloat(wsCandle.c),
        timestamp: wsCandle.t,
    };
}
/**
 * Convert array of WebSocket candles to internal Candle format
 */
function convertWsCandles(wsCandles) {
    return wsCandles.map(convertWsCandle);
}
/**
 * Convert candles to technical indicators format
 */
function convertToTechnicalFormat(candles) {
    return {
        open: candles.map((c) => c.open),
        high: candles.map((c) => c.high),
        low: candles.map((c) => c.low),
        close: candles.map((c) => c.close),
        volume: new Array(candles.length).fill(0), // Required by the library but not used for pattern detection
    };
}
