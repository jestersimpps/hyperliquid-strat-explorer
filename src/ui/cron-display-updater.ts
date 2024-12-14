import { contrib } from 'blessed-contrib';
import { WsCandle } from '../types/websocket';
import { BreakoutStrategy } from '../strategies/breakout';

export function updateTable(table: contrib.Widgets.TableElement, data: any[]): void {
    const headers = ['Symbol', 'Price', '24h Change', 'Volume', 'Confidence', 'Signal'];
    const rows = data.map(metric => [
        metric.symbol,
        metric.currentPrice.toFixed(2),
        (metric.priceChange >= 0 ? '+' : '') + metric.priceChange.toFixed(2) + '%',
        (metric.volumeUSD / 1000000).toFixed(2) + 'M',
        (metric.breakoutMetrics.confidence * 100).toFixed(1) + '%',
        metric.breakoutMetrics.type || 'NONE'
    ]);

    table.setData({
        headers,
        data: rows
    });
}

export function updateChart(
    chart: contrib.Widgets.LineElement, 
    symbol: string, 
    candles: WsCandle[], 
    strategy: BreakoutStrategy
): void {
    try {
        if (candles.length === 0) return;

        const times = candles.map(c => new Date(c.t).toLocaleTimeString());
        const prices = candles.map(c => parseFloat(c.c));

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const padding = (maxPrice - minPrice) * 0.1;

        const { support, resistance } = strategy.analyzeTrendlines(candles);

        const supportPoints = times.map((_, i) =>
            support.start.y + (support.end.y - support.start.y) * (i / (times.length - 1))
        );
        const resistancePoints = times.map((_, i) =>
            resistance.start.y + (resistance.end.y - resistance.start.y) * (i / (times.length - 1))
        );

        chart.setData([
            {
                title: `${symbol}/USD - ${candles[0].i} - ${candles.length} candles`,
                x: times,
                y: prices,
                style: { line: 'yellow', lineWidth: 1 }
            },
            {
                title: 'Support',
                x: times,
                y: supportPoints,
                style: { line: 'green', lineWidth: 1 }
            },
            {
                title: 'Resistance',
                x: times,
                y: resistancePoints,
                style: { line: 'red', lineWidth: 1 }
            }
        ]);

        chart.options.minY = minPrice - padding;
        chart.options.maxY = maxPrice + padding;

    } catch (error) {
        console.error(`Error updating chart for ${symbol}:`, error);
    }
}

export function updateBreakoutBox(breakoutBox: contrib.Widgets.TableElement, highestConfidence: any): void {
    const breakoutData = highestConfidence ? [
        ['Symbol', highestConfidence.symbol],
        ['Volume Increase', `${(highestConfidence.breakoutMetrics.volumeIncrease * 100).toFixed(1)}%`],
        ['Volume Confirmation', highestConfidence.breakoutMetrics.volumeConfirmation ? '✓' : '✗'],
        ['Price Action', highestConfidence.breakoutMetrics.priceAction ? '✓' : '✗'],
        ['Trend Alignment', highestConfidence.breakoutMetrics.trendAlignment ? '✓' : '✗'],
        ['False Breakout Check', highestConfidence.breakoutMetrics.falseBreakoutCheck ? '✓' : '✗'],
        ['Multi-Timeframe', highestConfidence.breakoutMetrics.multiTimeframe ? '✓' : '✗'],
        ['Volatility Check', highestConfidence.breakoutMetrics.volatilityCheck ? '✓' : '✗'],
        ['Time Elapsed', `${(highestConfidence.breakoutMetrics.timeElapsed / 60000).toFixed(1)}min`],
        ['Confidence', `${(highestConfidence.breakoutMetrics.confidence * 100).toFixed(1)}%`],
        ['Signal Type', highestConfidence.breakoutMetrics.type || 'NONE']
    ] : [['No active breakout signals', '']];

    breakoutBox.setData({
        headers: ['Indicator', 'Status'],
        data: breakoutData
    });
}
