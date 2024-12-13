"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartManager = void 0;
const breakout_1 = require("../strategies/breakout");
class ChartManager {
    ui;
    strategies;
    constructor(ui, symbols) {
        this.ui = ui;
        this.strategies = new Map(symbols.map(s => [s, new breakout_1.BreakoutStrategy()]));
    }
    updateChart(symbol, candles) {
        try {
            const chart = this.ui.charts.get(symbol);
            if (!chart) {
                throw new Error(`Chart not found for ${symbol}`);
            }
            // Ensure we have data to display
            if (candles.length === 0) {
                return;
            }
            const times = candles.map(c => new Date(c.t).toLocaleTimeString());
            const prices = candles.map(c => parseFloat(c.c));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const padding = (maxPrice - minPrice) * 0.1;
            const strategy = this.strategies.get(symbol);
            if (!strategy) {
                throw new Error(`Strategy not found for ${symbol}`);
            }
            const { support, resistance } = strategy.analyzeTrendlines(candles);
            const supportPoints = times.map((_, i) => support.start.y + (support.end.y - support.start.y) * (i / (times.length - 1)));
            const resistancePoints = times.map((_, i) => resistance.start.y + (resistance.end.y - resistance.start.y) * (i / (times.length - 1)));
            // Force chart refresh
            chart.setData([
                {
                    title: `${symbol}/USD - ${candles[0].i} - ${candles.length} candles`,
                    x: times,
                    y: prices,
                    style: { line: 'yellow' }
                },
                {
                    title: 'Support',
                    x: times,
                    y: supportPoints,
                    style: { line: 'green' }
                },
                {
                    title: 'Resistance',
                    x: times,
                    y: resistancePoints,
                    style: { line: 'red' }
                }
            ]);
            chart.options.minY = minPrice - padding;
            chart.options.maxY = maxPrice + padding;
            // this.ui.log.log(`Updated chart for ${symbol} with ${times.length} data points`);
        }
        catch (error) {
            this.ui.log.log(`Error updating chart for ${symbol}: ${error}`);
        }
    }
}
exports.ChartManager = ChartManager;
