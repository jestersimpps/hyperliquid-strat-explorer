import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';
import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';

async function main() {
    const symbol = 'HYPE'
    const interval = '1m'
    const oneHourMs = 60 * 60 * 1000 ;

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


    // Handle exit
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        return process.exit(0);
    });
    const api = new HyperliquidInfoAPI();
    const wsApi = new HyperliquidWebSocketAPI(api);

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
            log.log(
                `Time: ${new Date(latest.t).toISOString()} | ` +
                `O: ${parseFloat(latest.o).toFixed(2)} | ` +
                `H: ${parseFloat(latest.h).toFixed(2)} | ` +
                `L: ${parseFloat(latest.l).toFixed(2)} | ` +
                `C: ${parseFloat(latest.c).toFixed(2)} | ` +
                `V: ${parseFloat(latest.v).toFixed(2)} | ` +
                `Trades: ${latest.n}`
            );

            // Render the screen
            screen.render();
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
        wsApi.close();
        screen.destroy();
        process.exit(0);
    });

    // Initial render
    screen.render();
}

main().catch(console.error);
