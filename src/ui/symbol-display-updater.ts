import * as contrib from "blessed-contrib";
import { BreakoutSignal } from "../types/breakout";
import { updateBreakoutBox as sharedUpdateBreakoutBox, updateChart as sharedUpdateChart } from './shared-updater';

export function updateBreakoutBox(
  breakoutBox: contrib.Widgets.TableElement,
  breakoutSignals: Map<string, BreakoutSignal>
): void {
  sharedUpdateBreakoutBox(breakoutBox, breakoutSignals);
}

export function updateChart(
  chart: contrib.Widgets.LineElement,
  data: { times: string[]; prices: number[]; support: number[]; resistance: number[] },
  symbol: string
): void {
  sharedUpdateChart(chart, data);
}
