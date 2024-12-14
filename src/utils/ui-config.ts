import * as blessed from "blessed";
import * as contrib from "blessed-contrib";
import { ChartConfig } from "../types/ui";

export function createBaseScreen(title: string): blessed.Widgets.Screen {
  return blessed.screen({
    smartCSR: true,
    title
  });
}

export function createGrid(screen: blessed.Widgets.Screen): contrib.grid {
  return new contrib.grid({
    rows: 12,
    cols: 12,
    screen
  });
}

export function getDefaultChartConfig(symbol?: string): ChartConfig {
  return {
    style: {
      line: "yellow",
      text: "green",
      baseline: "black"
    },
    xLabelPadding: 3,
    xPadding: 5,
    showLegend: true,
    legendWidth: 20,
    legendPosition: "top-left",
    wholeNumbersOnly: false,
    label: symbol ? `${symbol}/USD Price Chart` : "Price Chart"
  };
}

export function setupExitHandler(screen: blessed.Widgets.Screen): void {
  screen.key(["escape", "q", "C-c"], () => {
    screen.destroy();
    process.exit(0);
  });
}
