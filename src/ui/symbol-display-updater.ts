import * as contrib from "blessed-contrib";
import { BreakoutSignal } from "../types/breakout";

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

export function updateChart(
  chart: contrib.Widgets.LineElement,
  data: { times: string[]; prices: number[]; support: number[]; resistance: number[] },
  symbol: string
): void {
  chart.setData([
    {
      title: `${symbol}/USD`,
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
