import * as blessed from "blessed";
import * as contrib from "blessed-contrib";
import { WsCandle } from "../types/websocket";
import { BreakoutStrategy } from "../strategies/breakout";
import { updateBreakoutBox } from "./shared-updater";

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
  title: "Market Monitor",
 });

 // Create a grid layout
 const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen,
 });

 // Create the chart (left side)
 const chart = grid.set(0, 0, 8, 8, contrib.line, {
  style: {
   line: "yellow",
   text: "green",
   baseline: "black",
  },
  lineWidth: 1,
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: true,
  legendWidth: 20,
  legendPosition: "top-left",
  wholeNumbersOnly: false,
  label: "Price Chart",
  minY: 0,
  maxY: 0,
 });

 // Create the table (bottom)
 const table = grid.set(8, 0, 4, 8, contrib.table, {
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  interactive: false,
  label: "Log",
  width: "50%",
  height: "100%",
  border: { type: "line", fg: "cyan" },
  columnSpacing: 3,
  columnWidth: [10, 10, 12, 10, 12, 20],
 });

 // Create breakout box (full height right side)
 const breakoutBox = grid.set(0, 8, 12, 4, contrib.table, {
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  interactive: true,
  mouse: true,
  label: "Highest Confidence Breakout",
  border: { type: "line", fg: "cyan" },
  columnSpacing: 2,
  columnWidth: [20, 20],
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'cyan'
    },
    style: {
      inverse: true
    }
  },
  clickable: true,
  focusable: false
 });

 // Create WebSocket log (bottom)
 const log = grid.set(8, 0, 4, 8, contrib.log, {
  fg: "green",
  selectedFg: "green",
  label: "WebSocket Activity",
  border: { type: "line", fg: "cyan" },
 });

 // Handle exit
 screen.key(["escape", "q", "C-c"], () => process.exit(0));

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
    try {
      if (!strategies.has(symbol)) {
        strategies.set(symbol, new BreakoutStrategy());
      }
      const strategy = strategies.get(symbol)!;
      const { support, resistance } = strategy.analyzeTrendlines(candles);
      
      const times = candles.map(c => new Date(c.t).toLocaleTimeString());
      const prices = candles.map(c => parseFloat(c.c));
      
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

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const padding = (maxPrice - minPrice) * 0.1;
      
      chart.options.minY = minPrice - padding;
      chart.options.maxY = maxPrice + padding;
    } catch (error) {
      log.log(`Error updating chart for ${symbol}: ${error}`);
    }
  },
  logWebSocketActivity: (message: string) => log.log(message),
  updateBreakoutBox: (highestConfidence: any) =>
   updateBreakoutBox(breakoutBox, highestConfidence),
 };
}

export function updateTable(
 table: contrib.Widgets.TableElement,
 data: any[]
): void {
 const headers = [
  "Symbol",
  "Price",
  "24h Change",
  "Volume",
  "Confidence",
  "Signal",
 ];
 const rows = data.map((metric) => [
  metric.symbol,
  metric.currentPrice.toFixed(2),
  (metric.priceChange >= 0 ? "+" : "") + metric.priceChange.toFixed(2) + "%",
  (metric.volumeUSD / 1000000).toFixed(2) + "M",
  (metric.breakoutMetrics.confidence * 100).toFixed(1) + "%",
  metric.breakoutMetrics.type || "NONE",
 ]);

 table.setData({
  headers,
  data: rows,
 });
}
