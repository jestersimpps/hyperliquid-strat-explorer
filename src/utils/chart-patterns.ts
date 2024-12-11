import {
  bullishengulfingpattern,
  morningstar,
  bullishharami,
  piercingline,
  bullishmarubozu,
  threewhitesoldiers,
  bearishengulfingpattern,
  eveningstar,
  bearishharami,
  darkcloudcover,
  bearishmarubozu,
  threeblackcrows
} from "technicalindicators";

import { Candle as WsCandle } from '../types/websocket';

interface Candle {
 high: number;
 low: number;
 open: number;
 close: number;
 timestamp: number;
}

export function convertWsCandle(wsCandle: WsCandle): Candle {
 return {
   high: parseFloat(wsCandle.h),
   low: parseFloat(wsCandle.l),
   open: parseFloat(wsCandle.o),
   close: parseFloat(wsCandle.c),
   timestamp: wsCandle.t
 };
}

interface PatternResult {
 pattern: string;
 startIndex: number;
 endIndex: number;
 confidence: number;
}

/**
 * Convert our candle format to technicalindicators format
 */
function convertCandles(candles: Candle[]): { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] } {
 return {
  open: candles.map((c) => c.open),
  high: candles.map((c) => c.high),
  low: candles.map((c) => c.low),
  close: candles.map((c) => c.close),
  volume: new Array(candles.length).fill(0), // Required by the library but not used for pattern detection
 };
}

/**
 * Detect all bullish patterns in the given candle data
 */
export function detectBullishPatterns(candles: WsCandle[]): PatternResult[] {
 const typedCandles = candles.map(wsCandle => ({
   high: parseFloat(wsCandle.h),
   low: parseFloat(wsCandle.l),
   open: parseFloat(wsCandle.o),
   close: parseFloat(wsCandle.c),
   timestamp: wsCandle.t
 }));
 const input = convertCandles(typedCandles);
 const results: PatternResult[] = [];

 // Bullish patterns
 const bullishPatterns = [
  { name: "BullishEngulfingPattern", detector: bullishengulfingpattern },
  { name: "MorningStarPattern", detector: morningstar },
  { name: "BullishHarami", detector: bullishharami },
  { name: "PiercingLine", detector: piercingline },
  { name: "BullishMarubozu", detector: bullishmarubozu },
  { name: "ThreeWhiteSoldiers", detector: threewhitesoldiers },
 ];

 for (const { name, detector } of bullishPatterns) {
  const detected = detector(input);

  for (let i = 0; i < detected.length; i++) {
   if (detected[i]) {
    results.push({
     pattern: name,
     startIndex: Math.max(0, i - 2), // Most patterns use 2-3 candles
     endIndex: i,
     confidence: calculatePatternConfidence(typedCandles, i, name),
    });
   }
  }
 }

 return results;
}

/**
 * Detect all bearish patterns in the given candle data
 */
export function detectBearishPatterns(candles: WsCandle[]): PatternResult[] {
 const typedCandles = candles.map(wsCandle => ({
   high: parseFloat(wsCandle.h),
   low: parseFloat(wsCandle.l),
   open: parseFloat(wsCandle.o),
   close: parseFloat(wsCandle.c),
   timestamp: wsCandle.t
 }));
 const input = convertCandles(typedCandles);
 const results: PatternResult[] = [];

 // Bearish patterns
 const bearishPatterns = [
  { name: "BearishEngulfingPattern", detector: bearishengulfingpattern },
  { name: "EveningStarPattern", detector: eveningstar },
  { name: "BearishHarami", detector: bearishharami },
  { name: "DarkCloudCover", detector: darkcloudcover },
  { name: "BearishMarubozu", detector: bearishmarubozu },
  { name: "ThreeBlackCrows", detector: threeblackcrows },
 ];

 for (const { name, detector } of bearishPatterns) {
  const detected = detector(input);

  for (let i = 0; i < detected.length; i++) {
   if (detected[i]) {
    results.push({
     pattern: name,
     startIndex: Math.max(0, i - 2),
     endIndex: i,
     confidence: calculatePatternConfidence(typedCandles, i, name),
    });
   }
  }
 }

 return results;
}

/**
 * Calculate confidence score for detected pattern
 */
function calculatePatternConfidence(
 candles: Candle[],
 index: number,
 patternName: string
): number {
 // Base confidence starts at 0.7 for a detected pattern
 let confidence = 0.7;

 // Adjust confidence based on pattern characteristics
 const currentCandle = candles[index];
 const prevCandle = candles[index - 1];

 if (!prevCandle) return confidence;

 // Factors that increase confidence:

 // 1. Size of the candles
 const candleSize =
  Math.abs(currentCandle.close - currentCandle.open) / currentCandle.open;
 confidence += Math.min(candleSize * 10, 0.1); // Max 0.1 boost

 // 2. Volume confirmation (if available)
 // Note: We don't have volume in our Candle interface currently

 // 3. Clear reversal from previous trend
 const priceChange =
  (currentCandle.close - prevCandle.close) / prevCandle.close;
 confidence += Math.min(Math.abs(priceChange) * 5, 0.1);

 // 4. Pattern specific adjustments
 switch (patternName) {
  case "BullishEngulfingPattern":
  case "BearishEngulfingPattern":
   // Larger engulfing patterns are more significant
   const engulfingSize =
    Math.abs(currentCandle.high - currentCandle.low) /
    Math.abs(prevCandle.high - prevCandle.low);
   confidence += Math.min((engulfingSize - 1) * 0.1, 0.1);
   break;

  case "MorningStarPattern":
  case "EveningStarPattern":
   // Stronger if middle candle is smaller (doji-like)
   const middleSize =
    Math.abs(candles[index - 1].close - candles[index - 1].open) /
    candles[index - 1].open;
   confidence += Math.min((0.01 / middleSize) * 0.1, 0.1);
   break;
 }

 return Math.min(confidence, 1); // Cap at 1.0
}

export function detectDoubleTop(
 candles: Candle[],
 minPeriod: number = 20,
 maxPeriod: number = 60,
 tolerance: number = 0.02
): DoubleTopPattern | null {
 if (candles.length < minPeriod) return null;

 const segment = candles.slice(-maxPeriod);
 const highs = segment.map((c) => c.high);

 const localMaxima = findLocalMaxima(highs, 5);

 if (localMaxima.length < 2) return null;

 for (let i = 0; i < localMaxima.length - 1; i++) {
  for (let j = i + 1; j < localMaxima.length; j++) {
   const firstPeak = highs[localMaxima[i]];
   const secondPeak = highs[localMaxima[j]];

   if (Math.abs(firstPeak - secondPeak) / firstPeak <= tolerance) {
    const between = highs.slice(localMaxima[i], localMaxima[j]);
    const neckline = Math.min(...between);

    if (neckline < firstPeak * 0.98 && localMaxima[j] - localMaxima[i] >= 5) {
     const confidence = calculateDoubleTopConfidence(
      firstPeak,
      secondPeak,
      neckline,
      localMaxima[j] - localMaxima[i]
     );

     return {
      type: "double-top",
      startIndex: localMaxima[i],
      endIndex: localMaxima[j],
      firstPeakIndex: localMaxima[i],
      secondPeakIndex: localMaxima[j],
      necklinePrice: neckline,
      confidence,
      peaks: [firstPeak, secondPeak],
     };
    }
   }
  }
 }

 return null;
}

export function detectHeadAndShoulders(
 candles: Candle[],
 inverse: boolean = false,
 minPeriod: number = 20,
 maxPeriod: number = 60,
 tolerance: number = 0.02
): HeadAndShouldersPattern | null {
 if (candles.length < minPeriod) return null;

 const segment = candles.slice(-maxPeriod);
 const prices = inverse
  ? segment.map((c) => c.low)
  : segment.map((c) => c.high);

 const extrema = inverse
  ? findLocalMinima(prices, 5)
  : findLocalMaxima(prices, 5);

 if (extrema.length < 3) return null;

 for (let i = 0; i < extrema.length - 2; i++) {
  const leftShoulder = prices[extrema[i]];
  const head = prices[extrema[i + 1]];
  const rightShoulder = prices[extrema[i + 2]];

  const shoulderDiff = Math.abs(leftShoulder - rightShoulder);

  if (shoulderDiff / leftShoulder <= tolerance) {
   const isValidPattern = inverse
    ? head < Math.min(leftShoulder, rightShoulder)
    : head > Math.max(leftShoulder, rightShoulder);

   if (isValidPattern) {
    const neckline = calculateNecklinePrice(
     segment,
     extrema[i],
     extrema[i + 2]
    );

    const confidence = calculateHSConfidence(
     leftShoulder,
     head,
     rightShoulder,
     neckline,
     extrema[i + 2] - extrema[i]
    );

    return {
     type: inverse ? "inverse-head-and-shoulders" : "head-and-shoulders",
     startIndex: extrema[i],
     endIndex: extrema[i + 2],
     leftShoulderIndex: extrema[i],
     headIndex: extrema[i + 1],
     rightShoulderIndex: extrema[i + 2],
     necklinePrice: neckline,
     shoulderPrices: [leftShoulder, rightShoulder],
     headPrice: head,
     confidence,
    };
   }
  }
 }

 return null;
}

export function detectFlag(
 candles: Candle[],
 bearish: boolean = false,
 minPeriod: number = 10,
 maxPeriod: number = 30
): FlagPattern | null {
 if (candles.length < minPeriod) return null;

 const segment = candles.slice(-maxPeriod);

 // Look for strong trend (pole)
 const poleStart = bearish
  ? Math.max(...segment.slice(0, 5).map((c) => c.high))
  : Math.min(...segment.slice(0, 5).map((c) => c.low));
 const poleEnd = bearish
  ? Math.min(...segment.slice(3, 8).map((c) => c.low))
  : Math.max(...segment.slice(3, 8).map((c) => c.high));

 const poleHeight = Math.abs(poleEnd - poleStart);
 const minPoleHeight = poleStart * (bearish ? 0.03 : 0.03); // Minimum 3% move

 if (poleHeight < minPoleHeight) return null;

 // Look for consolidation (flag)
 const flagPrices = segment.slice(8, 20).map((c) => (bearish ? c.high : c.low));

 const flagSlope = calculateSlope(flagPrices);
 const expectedSlope = bearish ? 0.001 : -0.001;

 if (Math.sign(flagSlope) !== Math.sign(expectedSlope)) return null;

 const confidence = calculateFlagConfidence(
  poleHeight / poleStart,
  flagSlope,
  flagPrices.length
 );

 return {
  type: bearish ? "bear-flag" : "bull-flag",
  startIndex: 0,
  endIndex: flagPrices.length + 8,
  poleStartIndex: 0,
  poleEndIndex: 7,
  flagStartIndex: 8,
  flagEndIndex: flagPrices.length + 8,
  poleHeight,
  flagSlope,
  confidence,
 };
}

function findLocalMinima(data: number[], window: number): number[] {
 const minima: number[] = [];

 for (let i = window; i < data.length - window; i++) {
  const current = data[i];
  const leftWindow = data.slice(i - window, i);
  const rightWindow = data.slice(i + 1, i + window + 1);

  if (
   current <= Math.min(...leftWindow) &&
   current <= Math.min(...rightWindow)
  ) {
   minima.push(i);
  }
 }

 return minima;
}

function findLocalMaxima(data: number[], window: number): number[] {
 const maxima: number[] = [];

 for (let i = window; i < data.length - window; i++) {
  const current = data[i];
  const leftWindow = data.slice(i - window, i);
  const rightWindow = data.slice(i + 1, i + window + 1);

  if (
   current >= Math.max(...leftWindow) &&
   current >= Math.max(...rightWindow)
  ) {
   maxima.push(i);
  }
 }

 return maxima;
}

function calculateNecklinePrice(
 candles: Candle[],
 leftIndex: number,
 rightIndex: number
): number {
 const leftPrice = candles[leftIndex].low;
 const rightPrice = candles[rightIndex].low;
 return (leftPrice + rightPrice) / 2;
}

function calculateSlope(prices: number[]): number {
 const xMean = (prices.length - 1) / 2;
 const yMean = average(prices);

 let numerator = 0;
 let denominator = 0;

 prices.forEach((y, x) => {
  numerator += (x - xMean) * (y - yMean);
  denominator += Math.pow(x - xMean, 2);
 });

 return numerator / denominator;
}

function calculateDoubleBottomConfidence(
 firstBottom: number,
 secondBottom: number,
 neckline: number,
 spacing: number
): number {
 const bottomSimilarity =
  1 - Math.abs(firstBottom - secondBottom) / firstBottom;
 const height = (neckline - Math.min(firstBottom, secondBottom)) / neckline;
 const spacingScore = Math.min(spacing / 20, 1);

 return bottomSimilarity * 0.4 + height * 0.3 + spacingScore * 0.3;
}

function calculateDoubleTopConfidence(
 firstPeak: number,
 secondPeak: number,
 neckline: number,
 spacing: number
): number {
 const peakSimilarity = 1 - Math.abs(firstPeak - secondPeak) / firstPeak;
 const height = (Math.max(firstPeak, secondPeak) - neckline) / firstPeak;
 const spacingScore = Math.min(spacing / 20, 1);

 return peakSimilarity * 0.4 + height * 0.3 + spacingScore * 0.3;
}

function calculateHSConfidence(
 leftShoulder: number,
 head: number,
 rightShoulder: number,
 neckline: number,
 spacing: number
): number {
 const shoulderSimilarity =
  1 - Math.abs(leftShoulder - rightShoulder) / leftShoulder;
 const headHeight = Math.abs(head - (leftShoulder + rightShoulder) / 2) / head;
 const spacingScore = Math.min(spacing / 30, 1);

 return shoulderSimilarity * 0.4 + headHeight * 0.4 + spacingScore * 0.2;
}

function calculateFlagConfidence(
 poleHeightRatio: number,
 flagSlope: number,
 flagLength: number
): number {
 const heightScore = Math.min(poleHeightRatio * 10, 1);
 const slopeScore = Math.min(Math.abs(flagSlope) * 100, 1);
 const lengthScore = Math.min(flagLength / 15, 1);

 return heightScore * 0.4 + slopeScore * 0.4 + lengthScore * 0.2;
}

interface BasePattern {
 startIndex: number;
 endIndex: number;
 confidence: number;
}

interface DoubleTopPattern extends BasePattern {
 type: "double-top";
 firstPeakIndex: number;
 secondPeakIndex: number;
 necklinePrice: number;
 peaks: [number, number];
}

interface HeadAndShouldersPattern extends BasePattern {
 type: "head-and-shoulders" | "inverse-head-and-shoulders";
 leftShoulderIndex: number;
 headIndex: number;
 rightShoulderIndex: number;
 necklinePrice: number;
 shoulderPrices: [number, number];
 headPrice: number;
}

interface FlagPattern extends BasePattern {
 type: "bull-flag" | "bear-flag";
 poleStartIndex: number;
 poleEndIndex: number;
 flagStartIndex: number;
 flagEndIndex: number;
 poleHeight: number;
 flagSlope: number;
}

interface TrianglePattern extends BasePattern {
 type: "ascending" | "descending";
 startIndex: number;
 endIndex: number;
 resistance: number;
 support: number;
 confidence: number;
}

/**
 * Detects ascending triangle pattern in candlestick data
 * Characteristics:
 * - Flat resistance line (horizontal top)
 * - Rising support line (ascending bottom)
 */
export function detectAscendingTriangle(
 candles: Candle[],
 minPeriod: number = 10,
 maxPeriod: number = 50,
 tolerance: number = 0.02
): TrianglePattern | null {
 if (candles.length < minPeriod) return null;

 for (
  let period = minPeriod;
  period <= Math.min(maxPeriod, candles.length);
  period++
 ) {
  const segment = candles.slice(-period);

  // Find potential resistance level (should be relatively flat)
  const highs = segment.map((c) => c.high);
  const resistance = Math.max(...highs);

  // Check if most highs are near the resistance level
  const highsNearResistance = highs.filter(
   (h) => Math.abs(h - resistance) / resistance < tolerance
  ).length;

  if (highsNearResistance < period * 0.4) continue;

  // Find rising support line
  const lows = segment.map((c) => c.low);
  const firstLows = lows.slice(0, Math.floor(period / 3));
  const lastLows = lows.slice(-Math.floor(period / 3));

  const avgFirstLows = average(firstLows);
  const avgLastLows = average(lastLows);

  // Confirm upward sloping support
  if (avgLastLows > avgFirstLows) {
   const confidence = calculateConfidence(
    highsNearResistance / period,
    (avgLastLows - avgFirstLows) / avgFirstLows,
    period / maxPeriod
   );

   return {
    type: "ascending",
    startIndex: candles.length - period,
    endIndex: candles.length - 1,
    resistance,
    support: avgLastLows,
    confidence,
   };
  }
 }

 return null;
}

/**
 * Detects descending triangle pattern in candlestick data
 * Characteristics:
 * - Flat support line (horizontal bottom)
 * - Falling resistance line (descending top)
 */
export function detectDescendingTriangle(
 candles: Candle[],
 minPeriod: number = 10,
 maxPeriod: number = 50,
 tolerance: number = 0.02
): TrianglePattern | null {
 if (candles.length < minPeriod) return null;

 for (
  let period = minPeriod;
  period <= Math.min(maxPeriod, candles.length);
  period++
 ) {
  const segment = candles.slice(-period);

  // Find potential support level (should be relatively flat)
  const lows = segment.map((c) => c.low);
  const support = Math.min(...lows);

  // Check if most lows are near the support level
  const lowsNearSupport = lows.filter(
   (l) => Math.abs(l - support) / support < tolerance
  ).length;

  if (lowsNearSupport < period * 0.4) continue;

  // Find falling resistance line
  const highs = segment.map((c) => c.high);
  const firstHighs = highs.slice(0, Math.floor(period / 3));
  const lastHighs = highs.slice(-Math.floor(period / 3));

  const avgFirstHighs = average(firstHighs);
  const avgLastHighs = average(lastHighs);

  // Confirm downward sloping resistance
  if (avgLastHighs < avgFirstHighs) {
   const confidence = calculateConfidence(
    lowsNearSupport / period,
    (avgFirstHighs - avgLastHighs) / avgFirstHighs,
    period / maxPeriod
   );

   return {
    type: "descending",
    startIndex: candles.length - period,
    endIndex: candles.length - 1,
    resistance: avgLastHighs,
    support,
    confidence,
   };
  }
 }

 return null;
}

function average(numbers: number[]): number {
 return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

export interface PatternInfo {
  bullish: {
    pattern: string;
    confidence: number;
  }[];
  bearish: {
    pattern: string;
    confidence: number;
  }[];
}

export function formatPatternInfo(info: PatternInfo): string {
  let content = '';
  
  if (info.bullish.length > 0) {
    content += 'Bullish Patterns:\n';
    info.bullish.forEach(p => {
      content += `  ${p.pattern} (${(p.confidence * 100).toFixed(1)}%)\n`;
    });
  }
  
  if (info.bearish.length > 0) {
    content += '\nBearish Patterns:\n';
    info.bearish.forEach(p => {
      content += `  ${p.pattern} (${(p.confidence * 100).toFixed(1)}%)\n`;
    });
  }
  
  return content || 'No patterns detected';
}

export function combinePatternResults(
  bullishPatterns: PatternResult[],
  bearishPatterns: PatternResult[]
): PatternInfo {
  return {
    bullish: bullishPatterns.map(p => ({
      pattern: p.pattern,
      confidence: p.confidence
    })),
    bearish: bearishPatterns.map(p => ({
      pattern: p.pattern,
      confidence: p.confidence
    }))
  };
}

function calculateConfidence(
 touchPointRatio: number,
 slopeStrength: number,
 periodRatio: number
): number {
 // Combine multiple factors to determine pattern confidence
 // Each factor is weighted and normalized to produce a score between 0-1
 const touchPointWeight = 0.4;
 const slopeWeight = 0.4;
 const periodWeight = 0.2;

 return (
  touchPointRatio * touchPointWeight +
  Math.min(slopeStrength * 5, 1) * slopeWeight +
  periodRatio * periodWeight
 );
}
