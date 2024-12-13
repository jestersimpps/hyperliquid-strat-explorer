"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHandler = void 0;
class WebSocketHandler {
    wsApi;
    ui;
    chartManager;
    breakoutManager;
    candleHistory = new Map();
    maxCandles;
    constructor(wsApi, ui, chartManager, breakoutManager, maxCandles) {
        this.wsApi = wsApi;
        this.ui = ui;
        this.chartManager = chartManager;
        this.breakoutManager = breakoutManager;
        this.maxCandles = maxCandles;
    }
    async subscribeToSymbol(symbol, interval, timeframe) {
        await this.wsApi.subscribeToCandles(symbol, interval, timeframe, ({ candles }) => {
            this.handleCandleUpdate(symbol, candles);
        });
    }
    handleCandleUpdate(symbol, candles) {
        try {
            if (!candles || candles.length === 0) {
                this.ui.log.log(`Warning: No candle data received for ${symbol}`);
                return;
            }
            if (candles[0].s !== symbol) {
                this.ui.log.log(`Warning: Received data for ${candles[0].s} while processing ${symbol}`);
                return;
            }
            // Update candle history
            let history = this.candleHistory.get(symbol) || [];
            // Add new candles
            for (const candle of candles) {
                const existingIndex = history.findIndex(c => c.t === candle.t);
                if (existingIndex !== -1) {
                    // Update existing candle
                    history[existingIndex] = candle;
                }
                else {
                    // Add new candle
                    history.push(candle);
                }
            }
            // Sort by timestamp and limit to maxCandles
            history = history
                .sort((a, b) => a.t - b.t)
                .slice(-this.maxCandles);
            this.candleHistory.set(symbol, history);
            // Update title with interval and candle count
            this.ui.updateTitle(candles[0].i, history.length);
            // Update chart with full history and force refresh
            this.chartManager.updateChart(symbol, history);
            // Process breakout signals
            this.breakoutManager.processCandles(symbol, history);
            // Log latest candle
            this.logLatestCandle(symbol, history[history.length - 1]);
            // Force screen refresh
            setImmediate(() => {
                this.ui.screen.render();
            });
        }
        catch (error) {
            this.ui.log.log(`Error processing ${symbol} data: ${error}`);
        }
    }
    logLatestCandle(symbol, candle) {
        this.ui.log.log(`[${symbol}] ${new Date(candle.t).toLocaleTimeString()} | ` +
            `O: ${parseFloat(candle.o).toFixed(2)} | ` +
            `H: ${parseFloat(candle.h).toFixed(2)} | ` +
            `L: ${parseFloat(candle.l).toFixed(2)} | ` +
            `C: ${parseFloat(candle.c).toFixed(2)} | ` +
            `V: ${parseFloat(candle.v).toFixed(2)}`);
    }
}
exports.WebSocketHandler = WebSocketHandler;
