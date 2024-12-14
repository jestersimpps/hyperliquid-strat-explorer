import { HyperliquidWebSocketAPI } from '../api/websocket';
import { WsCandle } from '../types/websocket';
import { UIComponents } from '../ui/symbol-display';
import { ChartManager } from './chart-manager';
import { BreakoutManager } from './breakout-manager';

export class WebSocketHandler {
    private candleHistory: Map<string, WsCandle[]> = new Map();
    private maxCandles: number;

    constructor(
        private wsApi: HyperliquidWebSocketAPI,
        private ui: UIComponents,
        private chartManager: ChartManager,
        private breakoutManager: BreakoutManager,
        maxCandles: number
    ) {
        this.maxCandles = maxCandles;
    }

    async subscribeToSymbol(symbol: string, interval: string, timeframe: number): Promise<void> {
        await this.wsApi.subscribeToCandles(symbol, interval, timeframe, ({ candles }) => {
            this.handleCandleUpdate(symbol, candles);
        });
    }

    private handleCandleUpdate(symbol: string, candles: WsCandle[]): void {
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
                } else {
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

        } catch (error) {
            this.ui.log.log(`Error processing ${symbol} data: ${error}`);
        }
    }

    private logLatestCandle(symbol: string, candle: WsCandle): void {
        this.ui.log.log(
            `[${symbol}] ${new Date(candle.t).toLocaleTimeString()} | ` +
            `O: ${parseFloat(candle.o).toFixed(2)} | ` +
            `H: ${parseFloat(candle.h).toFixed(2)} | ` +
            `L: ${parseFloat(candle.l).toFixed(2)} | ` +
            `C: ${parseFloat(candle.c).toFixed(2)} | ` +
            `V: ${parseFloat(candle.v).toFixed(2)}`
        );
    }
}
