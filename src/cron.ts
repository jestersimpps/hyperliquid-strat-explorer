import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';
import { WsCandle } from './types/websocket';
import { BreakoutStrategy } from './strategies/breakout';
import { playSound } from './utils/sound';
import { calculateTimeframe } from './utils/time';

class BackgroundMonitor {
    private candleHistory: Map<string, WsCandle[]> = new Map();
    private strategies: Map<string, BreakoutStrategy> = new Map();
    private breakoutTimestamps: Map<string, number> = new Map();

    constructor(
        private wsApi: HyperliquidWebSocketAPI,
        private symbols: string[],
        private interval: string,
        private maxCandles: number
    ) {
        this.symbols.forEach(symbol => {
            this.strategies.set(symbol, new BreakoutStrategy());
        });
    }

    async start(): Promise<void> {
        const timeframeMs = calculateTimeframe(this.interval, this.maxCandles);

        for (const symbol of this.symbols) {
            await this.wsApi.subscribeToCandles(
                symbol,
                this.interval,
                timeframeMs,
                ({ candles }) => this.handleCandleUpdate(symbol, candles)
            );
            console.log(`Subscribed to ${symbol} ${this.interval} candles`);
        }
    }

    private handleCandleUpdate(symbol: string, candles: WsCandle[]): void {
        try {
            if (!candles || candles.length === 0) {
                console.warn(`Warning: No candle data received for ${symbol}`);
                return;
            }

            // Update candle history
            let history = this.candleHistory.get(symbol) || [];
            
            // Add new candles
            for (const candle of candles) {
                const existingIndex = history.findIndex(c => c.t === candle.t);
                if (existingIndex !== -1) {
                    history[existingIndex] = candle;
                } else {
                    history.push(candle);
                }
            }

            // Sort by timestamp and limit to maxCandles
            history = history
                .sort((a, b) => a.t - b.t)
                .slice(-this.maxCandles);

            this.candleHistory.set(symbol, history);

            // Process breakout signals
            const strategy = this.strategies.get(symbol);
            if (strategy) {
                const signal = strategy.detectBreakout(history);
                if (signal) {
                    if (signal.confidence > 0.8) {
                        playSound('breakout');
                        console.log('\n🚨 HIGH CONFIDENCE BREAKOUT DETECTED!');
                        console.log(`Symbol: ${symbol}`);
                        console.log(`Type: ${signal.type}`);
                        console.log(`Price: ${signal.price.toFixed(2)}`);
                        console.log(`Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
                        console.log('Confirmations:');
                        Object.entries(signal.confirmations).forEach(([key, value]) => {
                            if (typeof value === 'boolean') {
                                console.log(`  ${key}: ${value ? '✓' : '✗'}`);
                            } else if (key === 'timeElapsed') {
                                console.log(`  ${key}: ${(value / 60000).toFixed(1)}min`);
                            } else if (key === 'volumeIncrease') {
                                console.log(`  ${key}: ${(value * 100).toFixed(1)}%`);
                            }
                        });
                        console.log('\n');
                    }
                }
            }

        } catch (error) {
            console.error(`Error processing ${symbol} data:`, error);
        }
    }
}

async function main() {
    try {
        // Configuration
        const symbols = ['BTC', 'ETH', 'SOL']; // Add more symbols as needed
        const interval = '5m';                 // Adjust interval as needed
        const maxCandles = 300;                 // Adjust history size as needed

        // Initialize APIs
        const api = new HyperliquidInfoAPI();
        const wsApi = new HyperliquidWebSocketAPI(api);

        // Create monitor
        const monitor = new BackgroundMonitor(wsApi, symbols, interval, maxCandles);

        // Connect to WebSocket
        await wsApi.connect();

        // Start monitoring
        await monitor.start();

        console.log('Background monitor started successfully');
        console.log(`Monitoring symbols: ${symbols.join(', ')}`);
        console.log(`Interval: ${interval}`);
        console.log(`History size: ${maxCandles} candles`);

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await wsApi.close();
                console.log('\nGracefully shutting down...');
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Start the application
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
