"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInterval = parseInterval;
exports.intervalToMs = intervalToMs;
exports.calculateTimeframe = calculateTimeframe;
function parseInterval(interval) {
    const match = interval.match(/^(\d+)([mhd])$/);
    if (!match) {
        throw new Error('Invalid interval format. Use format like 5m, 1h, 1d');
    }
    return {
        value: parseInt(match[1], 10),
        unit: match[2]
    };
}
function intervalToMs(interval) {
    const multipliers = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };
    return interval.value * multipliers[interval.unit];
}
function calculateTimeframe(interval, maxCandles) {
    const parsedInterval = parseInterval(interval);
    const intervalMs = intervalToMs(parsedInterval);
    return intervalMs * maxCandles;
}
