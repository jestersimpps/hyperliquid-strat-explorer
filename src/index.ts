import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';

async function main() {
    const wsApi = new HyperliquidWebSocketAPI(api);
    const api = new HyperliquidInfoAPI();

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
        const oneHourMs = 60 * 60 * 1000;
        await wsApi.subscribeToCandles('BTC', '1m', oneHourMs, ({ candles }) => {
            console.log('\nUpdated BTC 1-minute candles:');
            candles.forEach(candle => {
                console.log(`[${new Date(candle.t).toISOString()}] BTC Candle:`, {
                    open: candle.o,
                    high: candle.h,
                    low: candle.l,
                    close: candle.c,
                    volume: candle.v,
                    trades: candle.n
                });
            });
        });

        // If you have user authentication set up
        // await wsApi.subscribeToUserEvents((event) => {
        //     console.log('User Event:', event);
        // });

        // Rest of your code for fetching account information...

    } catch (error) {
        console.error('Error:', error);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nClosing connections...');
        wsApi.close();
        process.exit(0);
    });
}

main().catch(console.error);
