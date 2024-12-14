import { WsCandle } from "../types/websocket";
import { BreakoutStrategy } from "../strategies/breakout";
import * as contrib from "blessed-contrib";
export { updateBreakoutBox, updateChart } from './shared-updater';

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
