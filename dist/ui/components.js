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
exports.createUIComponents = createUIComponents;
exports.updateBreakoutBox = updateBreakoutBox;
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
function createUIComponents(symbols) {
    // Initialize blessed screen
    const screen = blessed.screen({
        smartCSR: true,
        title: "Hyperliquid Terminal",
    });
    // Create a grid layout
    const grid = new contrib.grid({
        rows: 12,
        cols: 12,
        screen: screen,
    });
    // Add chart for the symbol
    const charts = new Map([
        [
            symbols[0],
            grid.set(0, 0, 8, 12, contrib.line, {
                style: {
                    line: "yellow",
                    text: "green",
                    baseline: "black",
                },
                xLabelPadding: 3,
                xPadding: 5,
                showLegend: true,
                legendWidth: 20,
                legendPosition: "top-left", // Try this for legend position
                wholeNumbersOnly: false,
                label: `${symbols[0]}/USD Price Chart`,
            }),
        ],
    ]);
    // Add log box for latest candle info
    const log = grid.set(8, 0, 4, 6, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: "Latest Candle Info",
    });
    // Add breakout confirmation box
    const breakoutBox = grid.set(8, 6, 4, 6, contrib.table, {
        keys: true,
        fg: "white",
        selectedFg: "white",
        selectedBg: "blue",
        interactive: false,
        label: "Breakout Analysis",
        columnSpacing: 2,
        columnWidth: [20, 20],
    });
    // Handle exit
    screen.key(["escape", "q", "C-c"], function () {
        screen.destroy();
        process.exit(0);
    });
    const updateTitle = (interval, candleCount) => {
        screen.title = `Hyperliquid Terminal - ${interval} - ${candleCount} candles`;
    };
    return { screen, charts, log, breakoutBox, updateTitle };
}
function updateBreakoutBox(breakoutBox, breakoutSignals) {
    const breakoutData = Array.from(breakoutSignals.entries())
        .map(([sym, signal]) => [
        ["Symbol", sym],
        [
            "Volume Increase",
            `${(signal.confirmations.volumeIncrease * 100).toFixed(1)}%`,
        ],
        ["Price Action", signal.confirmations.priceAction ? "✓" : "✗"],
        ["Trend Alignment", signal.confirmations.trendAlignment ? "✓" : "✗"],
        [
            "False Breakout Check",
            signal.confirmations.falseBreakoutCheck ? "✓" : "✗",
        ],
        ["Multi-Timeframe", signal.confirmations.multiTimeframe ? "✓" : "✗"],
        ["Confidence", `${(signal.confidence * 100).toFixed(1)}%`],
        ["Signal Type", signal.type],
    ])
        .flat();
    breakoutBox.setData({
        headers: ["Indicator", "Status"],
        data: breakoutData.length > 0
            ? breakoutData
            : [["No active breakout signals", ""]],
    });
}
