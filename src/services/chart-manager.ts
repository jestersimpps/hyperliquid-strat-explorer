import { WsCandle } from '../types/websocket';
import { UIComponents } from '../ui/components';
import { BreakoutStrategy } from '../strategies/breakout';

export class ChartManager {
    private strategies: Map<string, BreakoutStrategy>;

    constructor(
        private ui: UIComponents,
        symbols: string[]
    ) {
        this.strategies = new Map(symbols.map(s => [s, new BreakoutStrategy()]));
    }

    updateChart(symbol: string, candles: WsCandle[]): void {
        try {
            const chart = this.ui.charts.get(symbol);
            if (!chart) {
                throw new Error(`Chart not found for ${symbol}`);
            }

            const times = candles.map(c => new Date(c.t).toLocaleTimeString());
            const prices = candles.map(c => parseFloat(c.c));
            
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const padding = (maxPrice - minPrice) * 0.1;

            const strategy = this.strategies.get(symbol);
            if (!strategy) {
                throw new Error(`Strategy not found for ${symbol}`);
            }
            
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
            
            chart.options.minY = minPrice - padding;
            chart.options.maxY = maxPrice + padding;
            
            // this.ui.log.log(`Updated chart for ${symbol} with ${times.length} data points`);
        } catch (error) {
            this.ui.log.log(`Error updating chart for ${symbol}: ${error}`);
        }
    }
}
