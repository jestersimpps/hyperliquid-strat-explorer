import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { BreakoutSignal } from '../types/breakout';

export interface UIComponents {
    screen: blessed.Screens;
    charts: Map<string, contrib.Widgets.LineElement>;
    log: contrib.Widgets.LogElement;
    breakoutBox: contrib.Widgets.TableElement;
}

export function createUIComponents(symbols: string[]): UIComponents {
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

    return { screen, charts, log, breakoutBox };
}

export function updateBreakoutBox(
    breakoutBox: contrib.Widgets.TableElement,
    breakoutSignals: Map<string, BreakoutSignal>
): void {
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
}
