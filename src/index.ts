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
    const breakoutBox = grid.set(8, 6, 4, 6, contrib.table, {
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
    screen.key(['escape', 'q', 'C-c'], function() {
        screen.destroy();
        process.exit(0);
    });

    const api = new HyperliquidInfoAPI();
    const wsApi = new HyperliquidWebSocketAPI(api);

    // Update breakout box function
    const updateBreakoutBox = () => {
        const breakoutData = Array.from(breakoutSignals.entries())
            .map(([sym, signal]) => [
                ['Symbol', sym],
                ['Volume Increase', `${(signal.confirmations.volumeIncrease * 100).toFixed(1)}%`],
                ['Price Action', signal.confirmations.priceAction ? '✓' : '✗'],
                ['Trend Alignment', signal.confirmations.trendAlignment ? '✓' : '✗'],
                ['False Breakout Check', signal.confirmations.falseBreakoutCheck ? '✓' : '✗'],
                ['Multi-Timeframe', signal.confirmations.multiTimeframe ? '✓' : '✗'],
                ['Confidence', `${(signal.confidence * 100).toFixed(1)}%`],
                ['Signal Type', signal.type]
            ]).flat();

        breakoutBox.setData({
            headers: ['Indicator', 'Status'],
            data: breakoutData.length > 0 ? breakoutData : [['No active breakout signals', '']]
        });
    };

    try {
        // Connect to WebSocket
        await wsApi.connect();

        // Subscribe to candles for each symbol
        for (const symbol of symbols) {
            await wsApi.subscribeToCandles(symbol, interval, oneHourMs, ({ candles }) => {
                try {
                    if (!candles || candles.length === 0) {
                        throw new Error(`No candle data received for ${symbol}`);
                    }

                    // Prepare data for the chart
                    const times = candles.map(c => new Date(c.t).toLocaleTimeString());
                    const prices = candles.map(c => parseFloat(c.c));
                    
                    // Calculate min and max prices with padding
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const padding = (maxPrice - minPrice) * 0.1;

                    const strategy = strategies.get(symbol);
                    if (!strategy) {
                        throw new Error(`Strategy not found for ${symbol}`);
                    }
                    
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
                    if (!chart) {
                        throw new Error(`Chart not found for ${symbol}`);
                    }

                    // Update the chart
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
                        `[${symbol}] ${new Date(latest.t).toLocaleTimeString()} | ` +
                        `O: ${parseFloat(latest.o).toFixed(2)} | ` +
                        `H: ${parseFloat(latest.h).toFixed(2)} | ` +
                        `L: ${parseFloat(latest.l).toFixed(2)} | ` +
                        `C: ${parseFloat(latest.c).toFixed(2)} | ` +
                        `V: ${parseFloat(latest.v).toFixed(2)}`
                    );

                    // Check for breakout
                    const breakoutSignal = strategy.detectBreakout(candles);
                    
                    // Update breakout signals
                    if (breakoutSignal) {
                        breakoutSignals.set(symbol, breakoutSignal);
                        if (breakoutSignal.confidence > 0.8) {
                            log.log(
                                `🚨 HIGH CONFIDENCE BREAKOUT on ${symbol}!\n` +
                                `Type: ${breakoutSignal.type} | ` +
                                `Price: ${breakoutSignal.price.toFixed(2)} | ` +
                                `Confidence: ${(breakoutSignal.confidence * 100).toFixed(1)}%`
                            );
                        }
                    } else {
                        breakoutSignals.delete(symbol);
                    }

                    // Update breakout box
                    updateBreakoutBox();

                    // Render screen
                    screen.render();

                } catch (error) {
                    log.log(`Error processing ${symbol} data: ${error}`);
                }
            });
        }

    } catch (error) {
        log.log(`Fatal error: ${error}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        screen.destroy();
        process.exit(1);
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        try {
            await wsApi.close();
            screen.destroy();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Initial render
    screen.render();
}

// Start the application
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});