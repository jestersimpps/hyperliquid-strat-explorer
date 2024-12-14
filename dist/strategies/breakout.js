"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakoutStrategy = void 0;
const support_resistance_1 = require("../utils/support-resistance");
class BreakoutStrategy {
    volumeThreshold = 1.5; // 150% of average volume
    breakoutTimestamps = new Map(); // Store breakout timestamps
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
    getIntervalMs(interval) {
        const value = parseInt(interval.slice(0, -1));
        const unit = interval.slice(-1);
        switch (unit) {
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 15 * 60 * 1000; // default 15min
        }
    }
    checkFalseBreakout(candles, breakoutCandle, level, type) {
        // Use 3 candle intervals as minimum confirmation time
        const minConfirmationTime = this.getIntervalMs(breakoutCandle.i) * 3;
        const subsequentCandles = candles.slice(candles.findIndex(c => c.t === breakoutCandle.t) + 1);
        // Check if enough time has passed
        const timeElapsed = subsequentCandles.length > 0 ?
            subsequentCandles[subsequentCandles.length - 1].t - breakoutCandle.t : 0;
        if (timeElapsed < minConfirmationTime) {
            return false;
        }
        // Check if price stayed beyond the level
        return subsequentCandles.every(candle => {
            const close = parseFloat(candle.c);
            return type === 'RESISTANCE_BREAK' ? close > level : close < level;
        });
    }
    calculateATR(candles) {
        let sum = 0;
        for (let i = 1; i < candles.length; i++) {
            const high = parseFloat(candles[i].h);
            const low = parseFloat(candles[i].l);
            const prevClose = parseFloat(candles[i - 1].c);
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            sum += tr;
        }
        return sum / candles.length;
    }
    checkVolatility(candles, periods = 20) {
        const atr = this.calculateATR(candles.slice(-periods));
        const currentPrice = parseFloat(candles[candles.length - 1].c);
        const volatilityThreshold = currentPrice * 0.005; // 0.5% of price
        return atr > volatilityThreshold;
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
        const volatilityConfirmation = this.checkVolatility(candles);
        // Calculate or get initial breakout timestamp
        const breakoutKey = `${breakoutType}-${level}`;
        if (!this.breakoutTimestamps.has(breakoutKey)) {
            this.breakoutTimestamps.set(breakoutKey, currentCandle.t);
        }
        const initialBreakoutTime = this.breakoutTimestamps.get(breakoutKey);
        const timeElapsed = currentCandle.t - initialBreakoutTime;
        const confirmations = {
            volumeIncrease: currentVolume / avgVolume,
            volumeConfirmation: volumeConfirmation,
            priceAction: priceActionConfirmation,
            trendAlignment: trendAlignmentConfirmation,
            falseBreakoutCheck: falseBreakoutConfirmation,
            multiTimeframe: true,
            volatilityCheck: volatilityConfirmation,
            timeElapsed: timeElapsed
        };
        const confidence = Object.values(confirmations).filter(Boolean).length / 8;
        // Clear breakout timestamp if confidence drops too low
        if (confidence < 0.2) {
            this.breakoutTimestamps.delete(breakoutKey);
            return null;
        }
        if (confidence >= 0.1) { // Require at least 10% confidence
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
