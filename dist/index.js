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
const info_1 = require("./api/info");
const websocket_1 = require("./api/websocket");
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const chart_patterns_1 = require("./utils/chart-patterns");
async function main() {
    const symbol = 'HYPE';
    const interval = '1m';
    const oneHourMs = 60 * 60 * 1000;
    // Initialize blessed screen
    const screen = blessed.screen({
        smartCSR: true,
        title: 'Hyperliquid Terminal'
    });
    // Create a grid layout
    const grid = new contrib.grid({
        rows: 12,
        cols: 12,
        screen: screen
    });
    // Add chart
    const line = grid.set(0, 0, 8, 12, contrib.line, {
        style: {
            line: "yellow",
            text: "green",
            baseline: "black"
        },
        xLabelPadding: 3,
        xPadding: 5,
        showLegend: true,
        wholeNumbersOnly: false,
        label: `${symbol}/USD Price`
    });
    // Add log box for latest candle info
    const log = grid.set(8, 0, 4, 6, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: 'Latest Candle Info'
    });
    // Add pattern info box
    const patternBox = grid.set(8, 6, 4, 6, blessed.box, {
        label: 'Pattern Analysis',
        padding: 1,
        border: {
            type: 'line'
        },
        style: {
            fg: 'yellow',
            border: {
                fg: 'green'
            }
        }
    });
    // Handle exit
    screen.key(['escape', 'q', 'C-c'], function (ch, key) {
        return process.exit(0);
    });
    const api = new info_1.HyperliquidInfoAPI();
    const wsApi = new websocket_1.HyperliquidWebSocketAPI(api);
    try {
        // Connect to WebSocket
        await wsApi.connect();
        // Subscribe to BTC trades
        // await wsApi.subscribeToTrades('BTC', (trade) => {
        //     console.log(`[${new Date().toISOString()}] BTC Trade:`, {
        //         price: trade.px,
        //         size: trade.sz,
        //         side: trade.side,
        //         timestamp: trade.time
        //     });
        // });
        // Subscribe to BTC order book
        // await wsApi.subscribeToL2Book('BTC', (book) => {
        //     console.log('Order Book Update:', book);
        // });
        // Subscribe to BTC ticker
        // await wsApi.subscribeToTicker('BTC', (ticker) => {
        //     console.log('Ticker Update:', ticker);
        // });
        // Subscribe to BTC 1-minute candles with 1 hour history
        await wsApi.subscribeToCandles(symbol, interval, oneHourMs, ({ candles }) => {
            // Prepare data for the chart
            const times = candles.map(c => new Date(c.t).toLocaleTimeString());
            const prices = candles.map(c => parseFloat(c.c));
            // Calculate min and max prices with some padding
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const padding = (maxPrice - minPrice) * 0.1; // 10% padding
            // Update the line chart
            line.setData([{
                    title: `${symbol}/USD`,
                    x: times,
                    y: prices,
                    style: {
                        line: 'yellow'
                    }
                }]);
            // Set y-axis range
            line.options.minY = minPrice - padding;
            line.options.maxY = maxPrice + padding;
            // Log latest candle info
            const latest = candles[candles.length - 1];
            log.log(`Time: ${new Date(latest.t).toISOString()} | ` +
                `O: ${parseFloat(latest.o).toFixed(2)} | ` +
                `H: ${parseFloat(latest.h).toFixed(2)} | ` +
                `L: ${parseFloat(latest.l).toFixed(2)} | ` +
                `C: ${parseFloat(latest.c).toFixed(2)} | ` +
                `V: ${parseFloat(latest.v).toFixed(2)} | ` +
                `Trades: ${latest.n}`);
            // Convert candles and detect patterns
            const bullishPatterns = (0, chart_patterns_1.detectBullishPatterns)(candles);
            const bearishPatterns = (0, chart_patterns_1.detectBearishPatterns)(candles);
            const patternInfo = (0, chart_patterns_1.combinePatternResults)(bullishPatterns, bearishPatterns);
            patternBox.setContent((0, chart_patterns_1.formatPatternInfo)(patternInfo));
            // Render the screen
            screen.render();
        });
        // If you have user authentication set up
        // await wsApi.subscribeToUserEvents((event) => {
        //     console.log('User Event:', event);
        // });
        // Rest of your code for fetching account information...
    }
    catch (error) {
        console.error('Error:', error);
    }
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        wsApi.close();
        screen.destroy();
        process.exit(0);
    });
    // Initial render
    screen.render();
}
main().catch(console.error);
