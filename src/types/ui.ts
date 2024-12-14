import * as blessed from "blessed";
import * as contrib from "blessed-contrib";
import { BreakoutSignal } from "./breakout";
import { WsCandle } from "./websocket";

export interface BaseUIComponents {
  screen: blessed.screen;
  log: contrib.Widgets.LogElement;
  breakoutBox: contrib.Widgets.TableElement;
}

export interface ChartConfig {
  style: {
    line: string;
    text: string;
    baseline: string;
  };
  xLabelPadding: number;
  xPadding: number;
  showLegend: boolean;
  legendWidth: number;
  legendPosition: string;
  wholeNumbersOnly: boolean;
  label: string;
}

export interface CandleData {
  times: string[];
  prices: number[];
  support: number[];
  resistance: number[];
}

export interface ProcessedCandle {
  time: string;
  price: number;
  volume: number;
  timestamp: number;
}
