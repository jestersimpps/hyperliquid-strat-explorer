 import * as blessed from 'blessed';
 import * as contrib from 'blessed-contrib';
 import { WsCandle } from '../types/websocket';
 import { BreakoutStrategy } from '../strategies/breakout';

 export interface CronUIComponents {
     screen: blessed.Widgets.Screen;
     table: contrib.Widgets.TableElement;
     chart: contrib.Widgets.LineElement;
     wsLog: contrib.Widgets.LogElement;
     breakoutBox: contrib.Widgets.TableElement;
     strategies: Map<string, BreakoutStrategy>;
     render: () => void;
     updateTable: (data: any[]) => void;
     updateChart: (symbol: string, candles: WsCandle[]) => void;
     logWebSocketActivity: (message: string) => void;
     updateBreakoutBox: (highestConfidence: any) => void;
 }

 export function createCronUIComponents(): CronUIComponents {
     const strategies = new Map<string, BreakoutStrategy>();
     const screen = blessed.screen({
         smartCSR: true,
         title: 'Market Monitor'
     });

     // Create a grid layout
     const grid = new contrib.grid({
         rows: 12,
         cols: 12,
         screen: screen
     });

     // Create the chart (top)
     const chart = grid.set(0, 0, 8, 12, contrib.line, {
         style: {
             line: "yellow",
             text: "green",
             baseline: "black"
         },
         lineWidth: 1,
         xLabelPadding: 3,
         xPadding: 5,
         showLegend: true,
         legendWidth: 20,
         legendPosition: "top-left",
         wholeNumbersOnly: false,
         label: 'Price Chart',
         minY: 0,
         maxY: 0
     });

     // Create the table (bottom left)
     const table = grid.set(8, 0, 4, 6, contrib.table, {
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
         columnWidth: [10, 10, 12, 10, 12, 20]
     });

     // Create breakout box (bottom middle)
     const breakoutBox = grid.set(8, 6, 4, 3, contrib.table, {
         keys: true,
         fg: 'white',
         selectedFg: 'white',
         selectedBg: 'blue',
         interactive: false,
         label: 'Highest Confidence Breakout',
         border: {type: "line", fg: "cyan"},
         columnSpacing: 2,
         columnWidth: [20, 20]
     });

     // Create WebSocket log (bottom right)
     const wsLog = grid.set(8, 9, 4, 3, contrib.log, {
         fg: "green",
         selectedFg: "green",
         label: "WebSocket Activity",
         border: {type: "line", fg: "cyan"}
     });

     // Handle exit
     screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

     function updateTable(data: any[]): void {
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

     function updateChart(symbol: string, candles: WsCandle[]): void {
         try {
             if (candles.length === 0) return;

             const times = candles.map(c => new Date(c.t).toLocaleTimeString());
             const prices = candles.map(c => parseFloat(c.c));

             const minPrice = Math.min(...prices);
             const maxPrice = Math.max(...prices);
             const padding = (maxPrice - minPrice) * 0.1;

             if (!strategies.has(symbol)) {
                 strategies.set(symbol, new BreakoutStrategy());
             }
             const strategy = strategies.get(symbol)!;

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
             wsLog.log(`Error updating chart for ${symbol}: ${error}`);
         }
     }

     function updateBreakoutBox(highestConfidence: any): void {
         const breakoutData = [
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
         ];

         breakoutBox.setData({
             headers: ['Indicator', 'Status'],
             data: breakoutData
         });
     }

     return {
         screen,
         table,
         chart,
         wsLog,
         breakoutBox,
         strategies,
         render: () => screen.render(),
         updateTable,
         updateChart,
         logWebSocketActivity: (message: string) => wsLog.log(message),
         updateBreakoutBox
     };
 }