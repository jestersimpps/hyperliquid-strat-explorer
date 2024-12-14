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
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const shared_updater_1 = require("./shared-updater");
function createUIComponents(symbol) {
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
            symbol,
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
                label: `${symbol}/USD Price Chart`,
            }),
        ],
    ]);
    // Add log box for latest candle info
    const log = grid.set(8, 0, 4, 6, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: "Log",
    });
    // Add breakout confirmation box
    const breakoutBox = grid.set(8, 6, 4, 6, contrib.table, {
        keys: true,
        fg: "white",
        selectedFg: "white",
        selectedBg: "blue",
        interactive: true,
        mouse: true,
        label: "Breakout Analysis",
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
    // Handle exit
    screen.key(["escape", "q", "C-c"], function () {
        screen.destroy();
        process.exit(0);
    });
    const updateTitle = (interval, candleCount) => {
        screen.title = `Hyperliquid Terminal - ${interval} - ${candleCount} candles`;
    };
    return {
        screen,
        charts,
        log,
        breakoutBox,
        updateTitle,
        render: () => screen.render(),
        updateBreakoutBox: (breakoutSignals) => (0, shared_updater_1.updateBreakoutBox)(breakoutBox, breakoutSignals),
        updateChart: (symbol, data) => {
            const chart = charts.get(symbol);
            if (chart) {
                chart.setData([
                    {
                        title: "Price",
                        x: data.times,
                        y: data.prices,
                        style: { line: "yellow" }
                    },
                    {
                        title: "Support",
                        x: data.times,
                        y: data.support,
                        style: { line: "green" }
                    },
                    {
                        title: "Resistance",
                        x: data.times,
                        y: data.resistance,
                        style: { line: "red" }
                    }
                ]);
            }
        },
    };
}
