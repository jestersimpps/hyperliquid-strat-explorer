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
exports.createCronUIComponents = createCronUIComponents;
exports.updateTable = updateTable;
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const breakout_1 = require("../strategies/breakout");
const shared_updater_1 = require("./shared-updater");
function createCronUIComponents() {
    const strategies = new Map();
    const screen = blessed.screen({
        smartCSR: true,
        title: "Market Monitor",
    });
    // Create a grid layout
    const grid = new contrib.grid({
        rows: 12,
        cols: 12,
        screen: screen,
    });
    // Create the chart (left side)
    const chart = grid.set(0, 0, 6, 8, contrib.line, {
        style: {
            line: "yellow",
            text: "green",
            baseline: "black",
        },
        lineWidth: 1,
        xLabelPadding: 3,
        xPadding: 5,
        showLegend: true,
        legendWidth: 20,
        legendPosition: "top-left",
        wholeNumbersOnly: false,
        label: "Price Chart",
        minY: 0,
        maxY: 0,
    });
    // Create the table (bottom left)
    const table = grid.set(6, 0, 6, 8, contrib.table, {
        keys: true,
        fg: "white",
        selectedFg: "white",
        selectedBg: "blue",
        interactive: false,
        label: "Log",
        width: "50%",
        height: "100%",
        border: { type: "line", fg: "cyan" },
        columnSpacing: 3,
        columnWidth: [10, 10, 12, 10, 12, 20],
    });
    // Create breakout box (full height right side)
    const breakoutBox = grid.set(0, 8, 12, 4, contrib.table, {
        keys: true,
        fg: "white",
        selectedFg: "white",
        selectedBg: "blue",
        interactive: true,
        mouse: true,
        label: "Highest Confidence Breakout",
        border: { type: "line", fg: "cyan" },
        columnSpacing: 2,
        columnWidth: [20, 20],
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            track: {
                bg: 'cyan'
            },
            style: {
                inverse: true
            }
        },
        clickable: true,
        focusable: false
    });
    // Create WebSocket log (bottom of right column)
    const log = grid.set(9, 8, 3, 4, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: "WebSocket Activity",
        border: { type: "line", fg: "cyan" },
    });
    // Handle exit
    screen.key(["escape", "q", "C-c"], () => process.exit(0));
    return {
        screen,
        table,
        chart,
        log,
        breakoutBox,
        strategies,
        render: () => screen.render(),
        updateTable: (data) => updateTable(table, data),
        updateChart: (symbol, candles) => {
            try {
                if (!strategies.has(symbol)) {
                    strategies.set(symbol, new breakout_1.BreakoutStrategy());
                }
                const strategy = strategies.get(symbol);
                const { support, resistance } = strategy.analyzeTrendlines(candles);
                const times = candles.map(c => new Date(c.t).toLocaleTimeString());
                const prices = candles.map(c => parseFloat(c.c));
                const supportPoints = times.map((_, i) => support.start.y + (support.end.y - support.start.y) * (i / (times.length - 1)));
                const resistancePoints = times.map((_, i) => resistance.start.y + (resistance.end.y - resistance.start.y) * (i / (times.length - 1)));
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
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const padding = (maxPrice - minPrice) * 0.1;
                chart.options.minY = minPrice - padding;
                chart.options.maxY = maxPrice + padding;
            }
            catch (error) {
                log.log(`Error updating chart for ${symbol}: ${error}`);
            }
        },
        logWebSocketActivity: (message) => log.log(message),
        updateBreakoutBox: (highestConfidence) => (0, shared_updater_1.updateBreakoutBox)(breakoutBox, highestConfidence),
    };
}
function updateTable(table, data) {
    const headers = [
        "Symbol",
        "Price",
        "24h Change",
        "Volume",
        "Confidence",
        "Signal",
    ];
    const rows = data.map((metric) => [
        metric.symbol,
        metric.currentPrice.toFixed(2),
        (metric.priceChange >= 0 ? "+" : "") + metric.priceChange.toFixed(2) + "%",
        (metric.volumeUSD / 1000000).toFixed(2) + "M",
        (metric.breakoutMetrics.confidence * 100).toFixed(1) + "%",
        metric.breakoutMetrics.type || "NONE",
    ]);
    table.setData({
        headers,
        data: rows,
    });
}
