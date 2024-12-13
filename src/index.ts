import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';
import { BreakoutStrategy } from './strategies/breakout';
import { BreakoutSignal } from './types/breakout';
import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';

async function main() {
    const symbols = ['BTC', 'HYPE'];
    const interval = '5m';
    const oneHourMs = 24 * 60 * 60 * 1000;
    const strategies = new Map(symbols.map(s => [s, new BreakoutStrategy()]));
    const breakoutSignals = new Map<string, BreakoutSignal>();

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

    // Add charts for each symbol
    const charts = new Map(symbols.map((symbol, index) => [
        symbol,
        grid.set(0, index * 6, 8, 6, contrib.line, {
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
        })
    ]));

    // Add log box for latest candle info
    const log = grid.set(8, 0, 4, 6, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: 'Latest Candle Info'
    });

    // Add breakout confirmation box
    const breakoutBox = grid.set(8, 4, 4, 8, contrib.table, {
        keys: true,
        fg: 'white',
        selectedFg: 'white',
        selectedBg: 'blue',
        interactive: false,
        label: 'Breakout Analysis',
        columnSpacing: 2,
        columnWidth: [20, 20]
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

        // Subscribe to candles for each symbol
        for (const symbol of symbols) {
            await wsApi.subscribeToCandles(symbol, interval, oneHourMs, ({ candles }) => {
            // Prepare data for the chart
            const times = candles.map(c => new Date(c.t).toLocaleTimeString());
            const prices = candles.map(c => parseFloat(c.c));
            
            // Calculate min and max prices with some padding
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const padding = (maxPrice - minPrice) * 0.1; // 10% padding

            const strategy = strategies.get(symbol);
            if (!strategy) return;
            
            // Calculate support and resistance lines
            const { support, resistance } = strategy.analyzeTrendlines(candles);
            
            // Convert support and resistance lines to chart format
            const supportPoints = times.map((_, i) => 
                support.start.y + (support.end.y - support.start.y) * (i / (times.length - 1))
            );
            const resistancePoints = times.map((_, i) => 
                resistance.start.y + (resistance.end.y - resistance.start.y) * (i / (times.length - 1))
            );

            const chart = charts.get(symbol);
            if (!chart) return;

            // Update the chart with price and S/R lines
            chart.setData([
                {
                    title: `${symbol}/USD`,
                    x: times,
                    y: prices,
                    style: { line: 'yellow' }
                },
                {
                    title: 'Support',
                    x: times,
                    y: supportPoints,
                    style: { line: 'green' }
                },
                {
                    title: 'Resistance',
                    x: times,
                    y: resistancePoints,
                    style: { line: 'red' }
                }
            ]);
            
            // Set y-axis range
            chart.options.minY = minPrice - padding;
            chart.options.maxY = maxPrice + padding;

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

            // Check for breakout using the corresponding strategy
            const strategy = strategies.get(symbol);
            if (!strategy) return;
            
            const breakoutSignal = strategy.detectBreakout(candles);
            
            // Update breakout signals map
            if (breakoutSignal) {
                breakoutSignals.set(symbol, breakoutSignal);
            } else {
                breakoutSignals.delete(symbol);
            }
            
            // Update breakout box with active signals
            const breakoutData = Array.from(breakoutSignals.entries()).map(([sym, signal]) => [
                ['Symbol', sym],
                ['Volume Increase', `${(signal.confirmations.volumeIncrease * 100).toFixed(1)}%`],
                ['Price Action', signal.confirmations.priceAction ? '✓' : '✗'],
                ['Trend Alignment', signal.confirmations.trendAlignment ? '✓' : '✗'],
                ['False Breakout Check', signal.confirmations.falseBreakoutCheck ? '✓' : '✗'],
                ['Multi-Timeframe', signal.confirmations.multiTimeframe ? '✓' : '✗'],
                ['Confidence', `${(signal.confidence * 100).toFixed(1)}%`],
                ['Signal Type', signal.type]
            ]).flat();
            
            if (breakoutData.length > 0) {
                breakoutBox.setData({
                    headers: ['Indicator', 'Status'],
                    data: breakoutData
                });
            } else {
                breakoutBox.setData({
                    headers: ['Indicator', 'Status'],
                    data: [['No active breakout signals', '']]
                });
            }

            // If there's a high confidence breakout, log it
            if (breakoutSignal && breakoutSignal.confidence > 0.8) {
                log.log(
                    `🚨 HIGH CONFIDENCE BREAKOUT DETECTED on ${symbol}!\n` +
                    `Type: ${breakoutSignal.type}\n` +
                    `Price: ${breakoutSignal.price.toFixed(2)}\n` +
                    `Confidence: ${(breakoutSignal.confidence * 100).toFixed(1)}%`
                );
            }
                if (breakoutSignal) {
                    log.log(
                        `🚨 HIGH CONFIDENCE BREAKOUT DETECTED!\n` +
                        `Type: ${breakoutSignal.type}\n` +
                        `Price: ${breakoutSignal.price.toFixed(2)}\n` +
                        `Confidence: ${(breakoutSignal.confidence * 100).toFixed(1)}%`
                    );
                }
            }

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
