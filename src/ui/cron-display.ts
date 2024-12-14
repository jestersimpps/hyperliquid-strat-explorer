 import * as blessed from 'blessed';
 import * as contrib from 'blessed-contrib';
 import { WsCandle } from '../types/websocket';
 import { BreakoutStrategy } from '../strategies/breakout';
import { BreakoutSignal } from '../types/breakout';

 export interface CronUIComponents {
     screen: blessed.Widgets.Screen;
     table: contrib.Widgets.TableElement;
     chart: contrib.Widgets.LineElement;
     log: contrib.Widgets.LogElement;
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
         label: 'Log',
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
     const log = grid.set(8, 9, 4, 3, contrib.log, {
         fg: "green",
         selectedFg: "green",
         label: "WebSocket Activity",
         border: {type: "line", fg: "cyan"}
     });

     // Handle exit
     screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

     import { updateTable, updateChart, updateBreakoutBox } from './cron-display-updater';

     return {
         screen,
         table,
         chart,
         log,
         breakoutBox,
         strategies,
         render: () => screen.render(),
         updateTable: (data: any[]) => updateTable(table, data),
         updateChart: (symbol: string, candles: WsCandle[]) => {
             if (!strategies.has(symbol)) {
                 strategies.set(symbol, new BreakoutStrategy());
             }
             updateChart(chart, symbol, candles, strategies.get(symbol)!);
         },
         logWebSocketActivity: (message: string) => log.log(message),
         updateBreakoutBox: (highestConfidence: any) => updateBreakoutBox(breakoutBox, highestConfidence)
     };
 }

 export function updateBreakoutBox(
  breakoutBox: contrib.Widgets.TableElement,
  breakoutSignals: Map<string, BreakoutSignal>
 ): void {
  const breakoutData = Array.from(breakoutSignals.entries())
   .map(([sym, signal]) => [
    ["Symbol", sym],
    [
     "Volume Increase",
     `${(signal.confirmations.volumeIncrease * 100).toFixed(1)}%`,
    ],
    ["Volume Confirmation", signal.confirmations.volumeConfirmation ? "✓" : "✗"],
    ["Price Action", signal.confirmations.priceAction ? "✓" : "✗"],
    ["Trend Alignment", signal.confirmations.trendAlignment ? "✓" : "✗"],
    [
     "False Breakout Check",
     signal.confirmations.falseBreakoutCheck ? "✓" : "✗",
    ],
    ["Multi-Timeframe", signal.confirmations.multiTimeframe ? "✓" : "✗"],
    ["Volatility Check", signal.confirmations.volatilityCheck ? "✓" : "✗"],
    ["Time Elapsed", `${(signal.confirmations.timeElapsed / 60000).toFixed(1)}min`],
    ["Confidence", `${(signal.confidence * 100).toFixed(1)}%`],
    ["Signal Type", signal.type],
   ])
   .flat();
 
  breakoutBox.setData({
   headers: ["Indicator", "Status"],
   data:
    breakoutData.length > 0
     ? breakoutData
     : [["No active breakout signals", ""]],
  });
 }
