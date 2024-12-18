"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const info_1 = require("./api/info");
const websocket_1 = require("./api/websocket");
const time_1 = require("./utils/time");
const cron_display_1 = require("./ui/cron-display");
const prompt_1 = require("./utils/prompt");
const breakout_manager_1 = require("./services/breakout-manager");
class BackgroundMonitor {
    wsApi;
    symbols;
    interval;
    maxCandles;
    candleHistory = new Map();
    display;
    breakoutManager;
    constructor(wsApi, symbols, interval, maxCandles) {
        this.wsApi = wsApi;
        this.symbols = symbols;
        this.interval = interval;
        this.maxCandles = maxCandles;
        this.display = (0, cron_display_1.createCronUIComponents)();
        this.breakoutManager = new breakout_manager_1.BreakoutManager(this.display, this.symbols);
        // Set higher limit for WebSocket event listeners
        this.wsApi.setMaxListeners(this.symbols.length + 10); // Add buffer for other listeners
    }
    async start() {
        const timeframeMs = (0, time_1.calculateTimeframe)(this.interval, this.maxCandles);
        // Subscribe to candles for all symbols
        for (const symbol of this.symbols) {
            await this.wsApi.subscribeToCandles(symbol, this.interval, timeframeMs, ({ candles }) => {
                const lastCandle = candles.length
                    ? candles[candles.length - 1].s
                    : undefined;
                if (lastCandle) {
                    this.handleCandleUpdate(lastCandle, candles);
                    this.display.logWebSocketActivity(`${new Date().toLocaleTimeString()} - Received ${candles.length} candles for ${symbol}`);
                }
            });
            //  console.log(`Subscribed to ${symbol} ${this.interval} candles`);
        }
        // Start analysis loop for market stats
        setInterval(() => {
            this.updateBreakoutBox();
            this.logMarketStats();
        }, 1000); // Run analysis every second
    }
    handleCandleUpdate(symbol, candles) {
        try {
            if (!candles || candles.length === 0) {
                console.warn(`Warning: No candle data received for ${symbol}`);
                return;
            }
            // Update candle history
            let history = this.candleHistory.get(symbol) || [];
            // Add new candles
            for (const candle of candles) {
                const existingIndex = history.findIndex((c) => c.t === candle.t);
                if (existingIndex !== -1) {
                    history[existingIndex] = candle;
                }
                else {
                    history.push(candle);
                }
            }
            // Sort by timestamp and limit to maxCandles
            history = history.sort((a, b) => a.t - b.t).slice(-this.maxCandles);
            this.candleHistory.set(symbol, history);
        }
        catch (error) {
            console.error(`Error processing ${symbol} data:`, error);
        }
    }
    getMarketMetrics() {
        return Array.from(this.candleHistory.entries())
            .filter(([_, history]) => history.length > 0)
            .map(([symbol, history]) => {
            const currentCandle = history[history.length - 1];
            const currentPrice = parseFloat(currentCandle.c);
            const dayAgoCandle = history[0];
            const prevDayPrice = parseFloat(dayAgoCandle.c);
            const priceChange = ((currentPrice - prevDayPrice) / prevDayPrice) * 100;
            const volumeUSD = parseFloat(currentCandle.v) * currentPrice;
            const breakoutMetrics = this.analyzeSymbol(symbol, history);
            return {
                symbol,
                currentPrice,
                priceChange,
                volumeUSD,
                breakoutMetrics,
                // Pre-format display strings
                symbolPad: symbol.padEnd(9),
                pricePad: currentPrice.toFixed(2).padEnd(11),
                changePad: (priceChange >= 0 ? "+" : "") + priceChange.toFixed(2).padEnd(8) + "%",
                volumePad: (volumeUSD / 1000000).toFixed(2).padEnd(10) + "M",
                confidencePad: (breakoutMetrics.confidence * 100).toFixed(1).padEnd(8) + "%",
                signalPad: (breakoutMetrics.type || "NONE").padEnd(10),
            };
        })
            .sort((a, b) => b.breakoutMetrics.confidence - a.breakoutMetrics.confidence);
    }
    logMarketStats() {
        const marketMetrics = this.getMarketMetrics();
        // Update the display
        this.display.updateTable(marketMetrics);
        // Update chart with highest confidence symbol
        if (marketMetrics.length > 0) {
            const highestConfidenceSymbol = marketMetrics[0].symbol;
            const candleData = this.candleHistory.get(highestConfidenceSymbol);
            if (candleData) {
                this.display.updateChart(highestConfidenceSymbol, candleData);
            }
        }
        this.display.render();
    }
    updateBreakoutBox() {
        const marketMetrics = this.getMarketMetrics();
        if (marketMetrics.length > 0) {
            const highestConfidence = marketMetrics[0];
            this.display.updateBreakoutBox(highestConfidence);
            this.display.render();
        }
    }
    analyzeSymbol(symbol, history) {
        this.breakoutManager.processCandles(symbol, history);
        const signal = this.breakoutManager.getSignal(symbol);
        if (!signal || history.length === 0) {
            return {
                confidence: 0,
                type: null,
                price: null,
                volumeIncrease: 0,
                timeElapsed: 0,
            };
        }
        return {
            confidence: signal.confidence,
            type: signal.type,
            price: signal.price,
            volumeIncrease: signal.confirmations.volumeIncrease,
            timeElapsed: signal.confirmations.timeElapsed,
        };
    }
}
async function main() {
    try {
        // Get user inputs first before creating display
        const interval = await (0, prompt_1.promptForInterval)();
        const maxCandles = 300; // Adjust history size as needed
        const topX = await (0, prompt_1.promptForTopSymbols)();
        // Now create display after prompts
        const display = (0, cron_display_1.createCronUIComponents)();
        display.log.log("Initializing display...");
        display.log.log("Initializing APIs...");
        const api = new info_1.HyperliquidInfoAPI();
        const wsApi = new websocket_1.HyperliquidWebSocketAPI(api);
        display.log.log("Fetching market data...");
        const [meta, assetCtxs] = await api.getMetaAndAssetCtxs();
        // Sort by 24h volume and take top 10
        const topSymbols = [
            "HYPE",
            ...assetCtxs
                .sort((a, b) => parseFloat(b.dayNtlVlm) - parseFloat(a.dayNtlVlm))
                .slice(0, topX)
                .map((asset, i) => meta.universe[i].name),
        ];
        display.log.log("Top symbols by 24h volume: " + topSymbols.join(", "));
        // Create monitor
        const monitor = new BackgroundMonitor(wsApi, topSymbols, interval, maxCandles);
        // Connect to WebSocket
        await wsApi.connect();
        // Start monitoring
        await monitor.start();
        // Handle graceful shutdown
        process.on("SIGINT", async () => {
            try {
                await wsApi.close();
                display.log.log("Gracefully shutting down...");
                process.exit(0);
            }
            catch (error) {
                display.log.log("Error during shutdown: " + error);
                process.exit(1);
            }
        });
    }
    catch (error) {
        process.exit(1);
    }
}
// Start the application
main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
