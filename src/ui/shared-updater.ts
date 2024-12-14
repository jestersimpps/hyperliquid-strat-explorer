import * as contrib from "blessed-contrib";
import { BreakoutSignal } from "../types/breakout";
import { WsCandle } from "../types/websocket";
import { BreakoutStrategy } from "../strategies/breakout";

export function updateBreakoutBox(
  breakoutBox: contrib.Widgets.TableElement,
  data: Map<string, BreakoutSignal> | any
): void {
  let breakoutData;
  
  if (data instanceof Map) {
    // Handle symbol-display case with Map
    breakoutData = Array.from(data.entries())
      .map(([sym, signal]) => [
        ["", ""],
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
  } else {
    // Handle cron-display case with single highest confidence object
    breakoutData = data ? [
      ["Symbol", data.symbol],
      [
        "Volume Increase",
        `${(data.breakoutMetrics.volumeIncrease * 100).toFixed(1)}%`,
      ],
      ["Volume Confirmation", data.breakoutMetrics.volumeConfirmation ? "✓" : "✗"],
      ["Price Action", data.breakoutMetrics.priceAction ? "✓" : "✗"],
      ["Trend Alignment", data.breakoutMetrics.trendAlignment ? "✓" : "✗"],
      [
        "False Breakout Check",
        data.breakoutMetrics.falseBreakoutCheck ? "✓" : "✗",
      ],
      ["Multi-Timeframe", data.breakoutMetrics.multiTimeframe ? "✓" : "✗"],
      ["Volatility Check", data.breakoutMetrics.volatilityCheck ? "✓" : "✗"],
      [
        "Time Elapsed",
        `${(data.breakoutMetrics.timeElapsed / 60000).toFixed(1)}min`,
      ],
      [
        "Confidence",
        `${(data.breakoutMetrics.confidence * 100).toFixed(1)}%`,
      ],
      ["Signal Type", data.breakoutMetrics.type || "NONE"],
    ] : [["No active breakout signals", ""]];
  }

  breakoutBox.setData({
    headers: ["Indicator", "Status"],
    data: breakoutData.length > 0 ? breakoutData : [["No active breakout signals", ""]]
  });
}

// Chart updates are now handled by ChartManager
