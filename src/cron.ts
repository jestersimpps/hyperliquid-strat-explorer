import { HyperliquidInfoAPI } from "./api/info";
import { HyperliquidWebSocketAPI } from "./api/websocket";
import { WsCandle } from "./types/websocket";
import { BreakoutStrategy } from "./strategies/breakout";
import { playSound } from "./utils/sound";
import { calculateTimeframe } from "./utils/time";
import Table from 'cli-table3';

class BackgroundMonitor {
 private candleHistory: Map<string, WsCandle[]> = new Map();
 private strategies: Map<string, BreakoutStrategy> = new Map();
 private breakoutTimestamps: Map<string, number> = new Map();

 constructor(
  private wsApi: HyperliquidWebSocketAPI,
  private symbols: string[],
  private interval: string,
  private maxCandles: number
 ) {
  // Initialize strategies and trade history
  this.symbols.forEach((symbol) => {
   this.strategies.set(symbol, new BreakoutStrategy());
  });
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
     if (lastCandle) this.handleCandleUpdate(lastCandle, candles);
    }
   );

   console.log(`Subscribed to ${symbol} ${this.interval} candles`);
  }

  // Start analysis loop
  setInterval(() => {
   this.logMarketStats();
  }, 1000); // Run analysis every second
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

 private logMarketStats(): void {
  // First calculate all metrics
  const marketMetrics = Array.from(this.candleHistory.entries())
   .filter(([_, history]) => history.length > 0)
   .map(([symbol, history]) => {
    const currentCandle = history[history.length - 1];
    const currentPrice = parseFloat(currentCandle.c);
    const dayAgoCandle = history[0];
    const prevDayPrice = parseFloat(dayAgoCandle.c);
    const priceChange = ((currentPrice - prevDayPrice) / prevDayPrice) * 100;
    const volumeUSD = parseFloat(currentCandle.v) * currentPrice;
    const lastUpdate = new Date(currentCandle.t).toLocaleTimeString();
    const breakoutMetrics = this.analyzeSymbol(symbol, history);

    return {
     symbol,
     currentPrice,
     priceChange,
     volumeUSD,
     lastUpdate,
     breakoutMetrics,
     // Pre-format display strings
     symbolPad: symbol.padEnd(9),
     pricePad: currentPrice.toFixed(2).padEnd(11),
     changePad: (priceChange >= 0 ? "+" : "") + priceChange.toFixed(2).padEnd(8) + "%",
     volumePad: (volumeUSD / 1000000).toFixed(2).padEnd(10) + "M",
     confidencePad: (breakoutMetrics.confidence * 100).toFixed(1).padEnd(8) + "%",
     signalPad: (breakoutMetrics.type || "NONE").padEnd(10)
    };
   })
   .sort((a, b) => b.breakoutMetrics.confidence - a.breakoutMetrics.confidence);

  // Then display the results
  console.clear();
  console.log("\n📊 Market Statistics");

  const table = new Table({
    head: ['Symbol', 'Price', '24h Change', 'Volume', 'Confidence', 'Signal', 'Last Update'],
    style: {
      head: ['cyan'],
      border: ['grey']
    },
    chars: {
      'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
      'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
      'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
      'right': '║', 'right-mid': '╢', 'middle': '│'
    }
  });

  for (const metric of marketMetrics) {
    const confidenceValue = (metric.breakoutMetrics.confidence * 100).toFixed(1) + '%';
    const confidenceStr = metric.breakoutMetrics.confidence > 0.8 
      ? `\x1b[32m${confidenceValue}\x1b[0m` // Green for high confidence
      : metric.breakoutMetrics.confidence > 0.5 
        ? `\x1b[33m${confidenceValue}\x1b[0m` // Yellow for medium confidence
        : confidenceValue;

    table.push([
      metric.symbol,
      metric.currentPrice.toFixed(2),
      (metric.priceChange >= 0 ? '+' : '') + metric.priceChange.toFixed(2) + '%',
      (metric.volumeUSD / 1000000).toFixed(2) + 'M',
      confidenceStr,
      metric.breakoutMetrics.type || 'NONE',
      metric.lastUpdate
    ]);
  }

  console.log(table.toString());
 }

 private analyzeSymbol(symbol: string, history: WsCandle[]): { 
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
       timeElapsed: 0
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
       timeElapsed: signal.confirmations.timeElapsed
     };
   }

   return {
     confidence: 0,
     type: null,
     price: null,
     volumeIncrease: 0,
     timeElapsed: 0
   };
 }
}

async function main() {
 try {
  // Configuration
  const interval = "5m"; // Adjust interval as needed
  const maxCandles = 300; // Adjust history size as needed

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
   .slice(0, 30)
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

  console.log("Background monitor started successfully");
  console.log(`Monitoring symbols: ${topSymbols.join(", ")}`);
  console.log(`Interval: ${interval}`);
  console.log(`History size: ${maxCandles} candles`);

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
