import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { WsCandle } from '../types/websocket';

export class DisplayManager {
    private screen: blessed.Widgets.Screen;
    private grid: any;
    private table: any;
    private chart: any;

    constructor() {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Market Monitor'
        });

        // Create a grid layout
        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen
        });

        // Create the chart (left side)
        this.chart = this.grid.set(0, 0, 12, 6, contrib.line, {
            style: {
                line: "yellow",
                text: "green",
                baseline: "black"
            },
            xLabelPadding: 3,
            xPadding: 5,
            showLegend: true,
            legendWidth: 20,
            legendPosition: "top-left",
            wholeNumbersOnly: false,
            label: 'Price Chart'
        });

        // Create the table (right side)
        this.table = this.grid.set(0, 6, 12, 6, contrib.table, {
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: false,
            label: 'Market Statistics',
            width: '50%',
            height: '100%',
            border: {type: "line", fg: "cyan"},
            columnSpacing: 3,
            columnWidth: [10, 10, 12, 10, 12, 12, 12]
        });

        // Handle exit
        this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
    }

    updateTable(data: any[]): void {
        const headers = ['Symbol', 'Price', '24h Change', 'Volume', 'Confidence', 'Signal', 'Last Update'];
        const rows = data.map(metric => [
            metric.symbol,
            metric.currentPrice.toFixed(2),
            (metric.priceChange >= 0 ? '+' : '') + metric.priceChange.toFixed(2) + '%',
            (metric.volumeUSD / 1000000).toFixed(2) + 'M',
            (metric.breakoutMetrics.confidence * 100).toFixed(1) + '%',
            metric.breakoutMetrics.type || 'NONE',
            metric.lastUpdate
        ]);

        this.table.setData({
            headers,
            data: rows
        });
    }

    updateChart(symbol: string, candles: WsCandle[]): void {
        const times = candles.map(c => new Date(c.t).toLocaleTimeString());
        const prices = candles.map(c => parseFloat(c.c));

        // Calculate support and resistance
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const support = sortedPrices[Math.floor(sortedPrices.length * 0.2)]; // 20th percentile
        const resistance = sortedPrices[Math.floor(sortedPrices.length * 0.8)]; // 80th percentile

        const supportLine = new Array(times.length).fill(support);
        const resistanceLine = new Array(times.length).fill(resistance);

        const data = [
            {
                title: symbol,
                x: times,
                y: prices,
                style: {
                    line: 'yellow'
                }
            },
            {
                title: 'Support',
                x: times,
                y: supportLine,
                style: {
                    line: 'green'
                }
            },
            {
                title: 'Resistance',
                x: times,
                y: resistanceLine,
                style: {
                    line: 'red'
                }
            }
        ];

        this.chart.setData(data);
    }

    render(): void {
        this.screen.render();
    }
}
