import { HyperliquidWebSocketAPI } from '../api/websocket';
import { WsCandle } from '../types/websocket';
import { UIComponents } from '../ui/symbol-display';
import { ChartManager } from './chart-manager';
import { BreakoutManager } from './breakout-manager';
import { updateCandleHistory } from '../utils/candle-processor';

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

            const history = this.candleHistory.get(symbol) || [];
            const updatedHistory = updateCandleHistory(history, candles, this.maxCandles);
            this.candleHistory.set(symbol, updatedHistory);

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
            // Format and log detailed error information
            const errorMessage = error instanceof Error ? error : new Error(String(error));
            const formattedError = [
                `Error processing ${symbol} data:`,
                errorMessage.message,
                ...(errorMessage.cause ? [`Cause: ${errorMessage.cause}`] : []),
                ...(errorMessage.stack ? errorMessage.stack.split('\n').slice(1, 3) : [])
            ].join('\n');
            
            this.ui.log.log(formattedError);
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
