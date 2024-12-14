import * as blessed from "blessed";
import * as contrib from "blessed-contrib";
import { BreakoutSignal } from "../types/breakout";
import { updateBreakoutBox, updateChart } from "./symbol-display-updater";

export interface UIComponents {
  screen: blessed.Widgets.Screen;
  charts: Map<string, contrib.Widgets.LineElement>;
  log: contrib.Widgets.LogElement;
  breakoutBox: contrib.Widgets.TableElement;
  updateTitle: (interval: string, candleCount: number) => void;
  updateBreakoutBox: (breakoutSignals: Map<string, BreakoutSignal>) => void;
  updateChart: (
    symbol: string,
    data: { times: string[]; prices: number[]; support: number[]; resistance: number[] }
  ) => void;
}

export function createUIComponents(symbol: string): UIComponents {
 // Initialize blessed screen
 const screen = blessed.screen({
  smartCSR: true,
  title: "Hyperliquid Terminal",
 });

 // Create a grid layout
 const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen,
 });

 // Add chart for the symbol
 const charts = new Map([
  [
   symbol,
   grid.set(0, 0, 8, 12, contrib.line, {
    style: {
     line: "yellow",
     text: "green",
     baseline: "black",
    },
    xLabelPadding: 3,
    xPadding: 5,
    showLegend: true,
    legendWidth: 20,
    legendPosition: "top-left", // Try this for legend position
    wholeNumbersOnly: false,
    label: `${symbol}/USD Price Chart`,
   }),
  ],
 ]);

 // Add log box for latest candle info
 const log = grid.set(8, 0, 4, 6, contrib.log, {
  fg: "green",
  selectedFg: "green",
  label: "Log",
 });

 // Add breakout confirmation box
 const breakoutBox = grid.set(8, 6, 4, 6, contrib.table, {
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  interactive: false,
  label: "Breakout Analysis",
  columnSpacing: 2,
  columnWidth: [20, 20],
 });

 // Handle exit
 screen.key(["escape", "q", "C-c"], function () {
  screen.destroy();
  process.exit(0);
 });

 const updateTitle = (interval: string, candleCount: number) => {
  screen.title = `Hyperliquid Terminal - ${interval} - ${candleCount} candles`;
 };

 return {
   screen,
   charts,
   log,
   breakoutBox,
   updateTitle,
   updateBreakoutBox: (breakoutSignals: Map<string, BreakoutSignal>) =>
     updateBreakoutBox(breakoutBox, breakoutSignals),
   updateChart: (symbol: string, data) => {
     const chart = charts.get(symbol);
     if (chart) {
       updateChart(chart, data, symbol);
     }
   },
 };
}

