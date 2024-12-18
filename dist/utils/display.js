"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayManager = void 0;
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const breakout_1 = require("../strategies/breakout");
class DisplayManager {
    screen;
    grid;
    table;
    chart;
    wsLog;
    breakoutBox;
    strategies;
    constructor() {
        this.strategies = new Map();
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Market Monitor'
        });
        // Create a grid layout
        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen
        });
        // Create the chart (top)
        this.chart = this.grid.set(0, 0, 8, 12, contrib.line, {
            style: {
                line: "yellow",
                text: "green",
                baseline: "black"
            },
            lineWidth: 1,
            xLabelPadding: 3,
            xPadding: 5,
            showLegend: true,
            legendWidth: 20,
            legendPosition: "top-left",
            wholeNumbersOnly: false,
            label: 'Price Chart',
            minY: 0,
            maxY: 0
        });
        // Create the table (bottom left)
        this.table = this.grid.set(8, 0, 4, 6, contrib.table, {
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: false,
            label: 'Market Statistics',
            width: '50%',
            height: '100%',
            border: { type: "line", fg: "cyan" },
            columnSpacing: 3,
            columnWidth: [10, 10, 12, 10, 12, 20]
        });
        // Create breakout box (bottom middle)
        this.breakoutBox = this.grid.set(8, 6, 4, 3, contrib.table, {
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: false,
            label: 'Highest Confidence Breakout',
            border: { type: "line", fg: "cyan" },
            columnSpacing: 2,
            columnWidth: [20, 20]
        });
        // Create WebSocket log (bottom right)
        this.wsLog = this.grid.set(8, 9, 4, 3, contrib.log, {
            fg: "green",
            selectedFg: "green",
            label: "WebSocket Activity",
            border: { type: "line", fg: "cyan" }
        });
        // Handle exit
        this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
    }
    updateTable(data) {
        // Update main table
        const headers = ['Symbol', 'Price', '24h Change', 'Volume', 'Confidence', 'Signal'];
        const rows = data.map(metric => [
            metric.symbol,
            metric.currentPrice.toFixed(2),
            (metric.priceChange >= 0 ? '+' : '') + metric.priceChange.toFixed(2) + '%',
            (metric.volumeUSD / 1000000).toFixed(2) + 'M',
            (metric.breakoutMetrics.confidence * 100).toFixed(1) + '%',
            metric.breakoutMetrics.type || 'NONE'
        ]);
        // Find highest confidence entry
        const highestConfidence = data.reduce((prev, current) => (current.breakoutMetrics.confidence > prev.breakoutMetrics.confidence) ? current : prev);
        // Update breakout box with detailed info for highest confidence symbol
        const breakoutData = [
            ['Symbol', highestConfidence.symbol],
            ['Volume Increase', `${(highestConfidence.breakoutMetrics.volumeIncrease * 100).toFixed(1)}%`],
            ['Volume Confirmation', highestConfidence.breakoutMetrics.volumeConfirmation ? '✓' : '✗'],
            ['Price Action', highestConfidence.breakoutMetrics.priceAction ? '✓' : '✗'],
            ['Trend Alignment', highestConfidence.breakoutMetrics.trendAlignment ? '✓' : '✗'],
            ['False Breakout Check', highestConfidence.breakoutMetrics.falseBreakoutCheck ? '✓' : '✗'],
            ['Multi-Timeframe', highestConfidence.breakoutMetrics.multiTimeframe ? '✓' : '✗'],
            ['Volatility Check', highestConfidence.breakoutMetrics.volatilityCheck ? '✓' : '✗'],
            ['Time Elapsed', `${(highestConfidence.breakoutMetrics.timeElapsed / 60000).toFixed(1)}min`],
            ['Confidence', `${(highestConfidence.breakoutMetrics.confidence * 100).toFixed(1)}%`],
            ['Signal Type', highestConfidence.breakoutMetrics.type || 'NONE']
        ];
        this.breakoutBox.setData({
            headers: ['Indicator', 'Status'],
            data: breakoutData
        });
        // Update main table
        this.table.setData({
            headers,
            data: rows
        });
    }
    updateChart(symbol, candles) {
        try {
            // Ensure we have data to display
            if (candles.length === 0) {
                return;
            }
            const times = candles.map(c => new Date(c.t).toLocaleTimeString());
            const prices = candles.map(c => parseFloat(c.c));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const padding = (maxPrice - minPrice) * 0.1;
            // Get or create strategy for this symbol
            if (!this.strategies.has(symbol)) {
                this.strategies.set(symbol, new breakout_1.BreakoutStrategy());
            }
            const strategy = this.strategies.get(symbol);
            const { support, resistance } = strategy.analyzeTrendlines(candles);
            const supportPoints = times.map((_, i) => support.start.y + (support.end.y - support.start.y) * (i / (times.length - 1)));
            const resistancePoints = times.map((_, i) => resistance.start.y + (resistance.end.y - resistance.start.y) * (i / (times.length - 1)));
            this.chart.setData([
                {
                    title: `${symbol}/USD - ${candles[0].i} - ${candles.length} candles`,
                    x: times,
                    y: prices,
                    style: { line: 'yellow', lineWidth: 1 }
                },
                {
                    title: 'Support',
                    x: times,
                    y: supportPoints,
                    style: { line: 'green', lineWidth: 1 }
                },
                {
                    title: 'Resistance',
                    x: times,
                    y: resistancePoints,
                    style: { line: 'red', lineWidth: 1 }
                }
            ]);
            this.chart.options.minY = minPrice - padding;
            this.chart.options.maxY = maxPrice + padding;
        }
        catch (error) {
            this.wsLog.log(`Error updating chart for ${symbol}: ${error}`);
        }
    }
    logWebSocketActivity(message) {
        this.wsLog.log(message);
    }
    render() {
        this.screen.render();
    }
}
exports.DisplayManager = DisplayManager;
