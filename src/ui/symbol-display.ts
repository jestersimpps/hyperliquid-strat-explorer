import * as blessed from "blessed";
import * as contrib from "blessed-contrib";
import { BreakoutSignal } from "../types/breakout";
import { BaseUIComponents, CandleData } from "../types/ui";
import {
 createBaseScreen,
 createGrid,
 getDefaultChartConfig,
 setupExitHandler,
} from "../utils/ui-config";
import { updateBreakoutBox } from "./shared-updater";

export interface UIComponents extends BaseUIComponents {
 screen: blessed.Widgets.Screen;
 charts: Map<string, contrib.Widgets.LineElement>;
 log: contrib.Widgets.LogElement;
 breakoutBox: contrib.Widgets.TableElement;
 updateTitle: (interval: string, candleCount: number) => void;
 updateBreakoutBox: (breakoutSignals: Map<string, BreakoutSignal>) => void;
 updateChart: (
  symbol: string,
  data: {
   times: string[];
   prices: number[];
   support: number[];
   resistance: number[];
  }
 ) => void;
 render: () => void;
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
  style: {
   fg: "white",
   focus: {
    border: {
     fg: "white",
    },
   },
  },
 });

 // Add breakout confirmation box
 const breakoutBox = grid.set(8, 6, 4, 6, contrib.table, {
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
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
  render: () => screen.render(),
  updateBreakoutBox: (breakoutSignals: Map<string, BreakoutSignal>) =>
   updateBreakoutBox(breakoutBox, breakoutSignals),
  updateChart: (symbol: string, data) => {
   const chart = charts.get(symbol);
   if (chart) {
    chart.setData([
     {
      title: "Price",
      x: data.times,
      y: data.prices,
      style: { line: "yellow" },
     },
     {
      title: "Support",
      x: data.times,
      y: data.support,
      style: { line: "green" },
     },
     {
      title: "Resistance",
      x: data.times,
      y: data.resistance,
      style: { line: "red" },
     },
    ]);
   }
  },
 };
}
