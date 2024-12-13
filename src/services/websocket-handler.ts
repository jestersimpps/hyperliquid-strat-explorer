import { HyperliquidWebSocketAPI } from '../api/websocket';
import { WsCandle } from '../types/websocket';
import { UIComponents } from '../ui/components';
import { ChartManager } from './chart-manager';
import { BreakoutManager } from './breakout-manager';

export class WebSocketHandler {
    constructor(
        private wsApi: HyperliquidWebSocketAPI,
        private ui: UIComponents,
        private chartManager: ChartManager,
        private breakoutManager: BreakoutManager
    ) {}

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

            this.ui.log.log(`Received ${candles.length} candles for ${symbol}`);

            // Update title with interval and candle count
            this.ui.updateTitle(candles[0].i, candles.length);

            // Update chart
            this.chartManager.updateChart(symbol, candles);

            // Process breakout signals
            this.breakoutManager.processCandles(symbol, candles);

            // Log latest candle
            this.logLatestCandle(symbol, candles[candles.length - 1]);

            // Render screen
            this.ui.screen.render();

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
