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

export function updateChart(
  chart: contrib.Widgets.LineElement,
  data: { times: string[]; prices: number[]; support: number[]; resistance: number[] } | 
        { symbol: string; candles: WsCandle[]; strategy: BreakoutStrategy }
): void {
  if ('candles' in data) {
    // Handle cron-display case
    const { symbol, candles, strategy } = data;
    if (candles.length === 0) return;

    const times = candles.map((c) => new Date(c.t).toLocaleTimeString());
    const prices = candles.map((c) => parseFloat(c.c));

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;

    const { support, resistance } = strategy.analyzeTrendlines(candles);

    const supportPoints = times.map(
      (_, i) =>
        support.start.y +
        (support.end.y - support.start.y) * (i / (times.length - 1))
    );
    const resistancePoints = times.map(
      (_, i) =>
        resistance.start.y +
        (resistance.end.y - resistance.start.y) * (i / (times.length - 1))
    );

    chart.setData([
      {
        title: `${symbol}/USD - ${candles[0].i} - ${candles.length} candles`,
        x: times,
        y: prices,
        style: { line: "yellow" },
      },
      {
        title: "Support",
        x: times,
        y: supportPoints,
        style: { line: "green" },
      },
      {
        title: "Resistance",
        x: times,
        y: resistancePoints,
        style: { line: "red" },
      },
    ]);

    chart.options.minY = minPrice - padding;
    chart.options.maxY = maxPrice + padding;
  } else {
    // Handle symbol-display case
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
}
