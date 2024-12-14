"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCandles = processCandles;
exports.updateCandleHistory = updateCandleHistory;
exports.formatCandle = formatCandle;
exports.logCandleInfo = logCandleInfo;
function processCandles(candles, maxCandles) {
    if (!candles || candles.length === 0)
        return [];
    return candles
        .sort((a, b) => a.t - b.t)
        .slice(-maxCandles);
}
function updateCandleHistory(history, newCandles, maxCandles) {
    let updatedHistory = [...history];
    for (const candle of newCandles) {
        const existingIndex = updatedHistory.findIndex(c => c.t === candle.t);
        if (existingIndex !== -1) {
            updatedHistory[existingIndex] = candle;
        }
        else {
            updatedHistory.push(candle);
        }
    }
    return processCandles(updatedHistory, maxCandles);
}
function formatCandle(candle) {
    return {
        time: new Date(candle.t).toLocaleTimeString(),
        price: parseFloat(candle.c),
        volume: parseFloat(candle.v),
        timestamp: candle.t
    };
}
function logCandleInfo(symbol, candle) {
    return `[${symbol}] ${new Date(candle.t).toLocaleTimeString()} | ` +
        `O: ${parseFloat(candle.o).toFixed(2)} | ` +
        `H: ${parseFloat(candle.h).toFixed(2)} | ` +
        `L: ${parseFloat(candle.l).toFixed(2)} | ` +
        `C: ${parseFloat(candle.c).toFixed(2)} | ` +
        `V: ${parseFloat(candle.v).toFixed(2)}`;
}
