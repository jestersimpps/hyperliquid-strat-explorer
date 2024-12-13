"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakoutStrategy = void 0;
const support_resistance_1 = require("../utils/support-resistance");
class BreakoutStrategy {
    volumeThreshold = 1.5; // 150% of average volume
    priceConfirmationPeriods = 3; // Number of candles to confirm breakout
    constructor() {
        // Initialize strategy
    }
    calculateAverageVolume(candles, periods = 20) {
        const recentCandles = candles.slice(-periods);
        return recentCandles.reduce((sum, candle) => sum + parseFloat(candle.v), 0) / periods;
    }
    checkVolumeConfirmation(currentVolume, averageVolume) {
        return currentVolume > (averageVolume * this.volumeThreshold);
    }
    checkPriceAction(candle, level, type) {
        const close = parseFloat(candle.c);
        return type === 'RESISTANCE_BREAK' ?
            close > level && parseFloat(candle.o) < level :
            close < level && parseFloat(candle.o) > level;
    }
    detectTrend(candles, periods = 20) {
        const prices = candles.slice(-periods).map(c => parseFloat(c.c));
        const firstAvg = prices.slice(0, Math.floor(periods / 2)).reduce((a, b) => a + b) / Math.floor(periods / 2);
        const secondAvg = prices.slice(-Math.floor(periods / 2)).reduce((a, b) => a + b) / Math.floor(periods / 2);
        const difference = secondAvg - firstAvg;
        if (Math.abs(difference) < firstAvg * 0.01)
            return 'SIDEWAYS';
        return difference > 0 ? 'UP' : 'DOWN';
    }
    checkFalseBreakout(candles, breakoutCandle, level, type) {
        const subsequentCandles = candles.slice(candles.findIndex(c => c.t === breakoutCandle.t) + 1, candles.findIndex(c => c.t === breakoutCandle.t) + 1 + this.priceConfirmationPeriods);
        return subsequentCandles.every(candle => {
            const close = parseFloat(candle.c);
            return type === 'RESISTANCE_BREAK' ? close > level : close < level;
        });
    }
    detectBreakout(candles) {
        if (candles.length < 20)
            return null;
        const { support, resistance } = this.analyzeTrendlines(candles);
        const currentCandle = candles[candles.length - 1];
        const currentPrice = parseFloat(currentCandle.c);
        const currentVolume = parseFloat(currentCandle.v);
        const avgVolume = this.calculateAverageVolume(candles);
        const trend = this.detectTrend(candles);
        // Check for breakout
        let breakoutType = null;
        let level = 0;
        const resistanceLevel = resistance.end.y;
        const supportLevel = support.end.y;
        const priceThreshold = Math.abs(resistanceLevel - supportLevel) * 0.01; // 1% threshold
        if (currentPrice > resistanceLevel) {
            breakoutType = 'RESISTANCE_BREAK';
            level = resistanceLevel;
        }
        else if (currentPrice < supportLevel) {
            breakoutType = 'SUPPORT_BREAK';
            level = supportLevel;
        }
        else if (Math.abs(currentPrice - resistanceLevel) <= priceThreshold) {
            breakoutType = 'AT_RESISTANCE';
            level = resistanceLevel;
        }
        else if (Math.abs(currentPrice - supportLevel) <= priceThreshold) {
            breakoutType = 'AT_SUPPORT';
            level = supportLevel;
        }
        if (!breakoutType)
            return null;
        // Validate breakout
        const volumeConfirmation = this.checkVolumeConfirmation(currentVolume, avgVolume);
        const priceActionConfirmation = this.checkPriceAction(currentCandle, level, breakoutType);
        const trendAlignmentConfirmation = ((breakoutType === 'RESISTANCE_BREAK' && trend === 'UP') ||
            (breakoutType === 'SUPPORT_BREAK' && trend === 'DOWN'));
        const falseBreakoutConfirmation = breakoutType === 'RESISTANCE_BREAK' || breakoutType === 'SUPPORT_BREAK'
            ? this.checkFalseBreakout(candles, currentCandle, level, breakoutType)
            : false;
        // Calculate confidence score
        const confirmations = {
            volumeIncrease: currentVolume / avgVolume,
            priceAction: priceActionConfirmation,
            trendAlignment: trendAlignmentConfirmation,
            falseBreakoutCheck: falseBreakoutConfirmation,
            multiTimeframe: true // This would need to be implemented with multiple timeframe data
        };
        const confidence = Object.values(confirmations).filter(Boolean).length / 5;
        if (confidence >= 0.6) { // Require at least 60% confidence
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
    analyzeTrendlines(candles) {
        if (candles.length < 50) {
            return (0, support_resistance_1.detectSupportResistance)(candles);
        }
        // Keep minimum of latest 50 candles
        const minCandles = 50;
        const latestCandles = candles.slice(-minCandles);
        // Start with full array and decrease size
        let bestSupport = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, strength: 0 };
        let bestResistance = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, strength: 0 };
        for (let size = candles.length; size >= minCandles; size -= 10) {
            const subset = candles.slice(-size);
            const { support, resistance } = (0, support_resistance_1.detectSupportResistance)(subset);
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
exports.BreakoutStrategy = BreakoutStrategy;
