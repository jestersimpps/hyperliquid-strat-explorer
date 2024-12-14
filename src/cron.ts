import { HyperliquidInfoAPI } from "./api/info";
import { HyperliquidWebSocketAPI } from "./api/websocket";
import { WsCandle } from "./types/websocket";
import { BreakoutStrategy } from "./strategies/breakout";
import { playSound } from "./utils/sound";
import { calculateTimeframe } from "./utils/time";
import { DisplayManager } from "./utils/display";
import { promptForInterval } from "./utils/prompt";

const TOP_X = 30;
class BackgroundMonitor {
 private candleHistory: Map<string, WsCandle[]> = new Map();
 private strategies: Map<string, BreakoutStrategy> = new Map();
 private display: DisplayManager;

 constructor(
  private wsApi: HyperliquidWebSocketAPI,
  private symbols: string[],
  private interval: string,
  private maxCandles: number
 ) {
  this.display = new DisplayManager();
  // Initialize strategies and trade history
  this.symbols.forEach((symbol) => {
   this.strategies.set(symbol, new BreakoutStrategy());
  });

  // Set higher limit for WebSocket event listeners
  this.wsApi.setMaxListeners(this.symbols.length + 10); // Add buffer for other listeners
 }

 async start(): Promise<void> {
  const timeframeMs = calculateTimeframe(this.interval, this.maxCandles);

  // Subscribe to candles for all symbols
  for (const symbol of this.symbols) {
   await this.wsApi.subscribeToCandles(
    symbol,
    this.interval,
    timeframeMs,
    ({ candles }) => {
     const lastCandle = candles.length
      ? candles[candles.length - 1].s
      : undefined;
     if (lastCandle) {
      this.handleCandleUpdate(lastCandle, candles);
      this.display.logWebSocketActivity(
       `${new Date().toLocaleTimeString()} - Received ${
        candles.length
       } candles for ${symbol}`
      );
     }
    }
   );

   //  console.log(`Subscribed to ${symbol} ${this.interval} candles`);
  }

  // Start analysis loop for market stats
  setInterval(() => {
   this.logMarketStats();
  }, 1000); // Run analysis every second

  // Start breakout box update loop
  setInterval(() => {
   this.updateBreakoutBox();
  }, 100); // Update breakout box more frequently
 }

 private handleCandleUpdate(symbol: string, candles: WsCandle[]): void {
  try {
   if (!candles || candles.length === 0) {
    console.warn(`Warning: No candle data received for ${symbol}`);
    return;
   }

   // Update candle history
   let history = this.candleHistory.get(symbol) || [];

   // Add new candles
   for (const candle of candles) {
    const existingIndex = history.findIndex((c) => c.t === candle.t);
    if (existingIndex !== -1) {
     history[existingIndex] = candle;
    } else {
     history.push(candle);
    }
   }

   // Sort by timestamp and limit to maxCandles
   history = history.sort((a, b) => a.t - b.t).slice(-this.maxCandles);

   this.candleHistory.set(symbol, history);
  } catch (error) {
   console.error(`Error processing ${symbol} data:`, error);
  }
 }

 private getMarketMetrics() {
  return Array.from(this.candleHistory.entries())
   .filter(([_, history]) => history.length > 0)
   .map(([symbol, history]) => {
    const currentCandle = history[history.length - 1];
    const currentPrice = parseFloat(currentCandle.c);
    const dayAgoCandle = history[0];
    const prevDayPrice = parseFloat(dayAgoCandle.c);
    const priceChange = ((currentPrice - prevDayPrice) / prevDayPrice) * 100;
    const volumeUSD = parseFloat(currentCandle.v) * currentPrice;
    const breakoutMetrics = this.analyzeSymbol(symbol, history);

    return {
     symbol,
     currentPrice,
     priceChange,
     volumeUSD,
     breakoutMetrics,
     // Pre-format display strings
     symbolPad: symbol.padEnd(9),
     pricePad: currentPrice.toFixed(2).padEnd(11),
     changePad:
      (priceChange >= 0 ? "+" : "") + priceChange.toFixed(2).padEnd(8) + "%",
     volumePad: (volumeUSD / 1000000).toFixed(2).padEnd(10) + "M",
     confidencePad:
      (breakoutMetrics.confidence * 100).toFixed(1).padEnd(8) + "%",
     signalPad: (breakoutMetrics.type || "NONE").padEnd(10),
    };
   })
   .sort((a, b) => b.breakoutMetrics.confidence - a.breakoutMetrics.confidence);
 }

 private logMarketStats(): void {
  const marketMetrics = this.getMarketMetrics();
  
  // Update the display
  this.display.updateTable(marketMetrics);

  // Update chart with highest confidence symbol
  if (marketMetrics.length > 0) {
   const highestConfidenceSymbol = marketMetrics[0].symbol;
   const candleData = this.candleHistory.get(highestConfidenceSymbol);
   if (candleData) {
    this.display.updateChart(highestConfidenceSymbol, candleData);
   }
  }

  this.display.render();
 }

 private updateBreakoutBox(): void {
  const marketMetrics = this.getMarketMetrics();
  if (marketMetrics.length > 0) {
   const highestConfidence = marketMetrics[0];
   this.display.updateBreakoutBox(highestConfidence);
   this.display.render();
  }
 }

 private analyzeSymbol(
  symbol: string,
  history: WsCandle[]
 ): {
  confidence: number;
  type: string | null;
  price: number | null;
  volumeIncrease: number;
  timeElapsed: number;
 } {
  const strategy = this.strategies.get(symbol);
  if (!strategy || history.length === 0) {
   return {
    confidence: 0,
    type: null,
    price: null,
    volumeIncrease: 0,
    timeElapsed: 0,
   };
  }

  const signal = strategy.detectBreakout(history);
  if (signal) {
   if (signal.confidence > 0.8) {
    playSound("breakout");
   }
   return {
    confidence: signal.confidence,
    type: signal.type,
    price: signal.price,
    volumeIncrease: signal.confirmations.volumeIncrease,
    timeElapsed: signal.confirmations.timeElapsed,
   };
  }

  return {
   confidence: 0,
   type: null,
   price: null,
   volumeIncrease: 0,
   timeElapsed: 0,
  };
 }
}

async function main() {
 try {
  // Clear console
  console.clear();

  // Get user inputs
  const interval = await promptForInterval();
  const maxCandles = 300; // Adjust history size as needed

  // Initialize display
  console.log("Initializing display...");

  // Initialize APIs
  console.log("Initializing APIs...");
  const api = new HyperliquidInfoAPI();
  const wsApi = new HyperliquidWebSocketAPI(api);

  // Fetch market data
  console.log("Fetching market data...");
  const [meta, assetCtxs] = await api.getMetaAndAssetCtxs();

  // Sort by 24h volume and take top 10
  const topSymbols = assetCtxs
   .sort((a, b) => parseFloat(b.dayNtlVlm) - parseFloat(a.dayNtlVlm))
   .slice(0, TOP_X)
   .map((asset, i) => meta.universe[i].name);

  console.log("Top symbols by 24h volume:", topSymbols.join(", "));

  // Create monitor
  const monitor = new BackgroundMonitor(
   wsApi,
   topSymbols,
   interval,
   maxCandles
  );

  // Connect to WebSocket
  await wsApi.connect();

  // Start monitoring
  await monitor.start();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
   try {
    await wsApi.close();
    console.log("\nGracefully shutting down...");
    process.exit(0);
   } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
   }
  });
 } catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
 }
}

// Start the application
main().catch((error) => {
 console.error("Unhandled error:", error);
 process.exit(1);
});
