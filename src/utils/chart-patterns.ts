interface Candle {
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

interface TrianglePattern {
  type: 'ascending' | 'descending';
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

  for (let period = minPeriod; period <= Math.min(maxPeriod, candles.length); period++) {
    const segment = candles.slice(-period);
    
    // Find potential resistance level (should be relatively flat)
    const highs = segment.map(c => c.high);
    const resistance = Math.max(...highs);
    
    // Check if most highs are near the resistance level
    const highsNearResistance = highs.filter(h => 
      Math.abs(h - resistance) / resistance < tolerance
    ).length;
    
    if (highsNearResistance < period * 0.4) continue;

    // Find rising support line
    const lows = segment.map(c => c.low);
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
        type: 'ascending',
        startIndex: candles.length - period,
        endIndex: candles.length - 1,
        resistance,
        support: avgLastLows,
        confidence
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

  for (let period = minPeriod; period <= Math.min(maxPeriod, candles.length); period++) {
    const segment = candles.slice(-period);
    
    // Find potential support level (should be relatively flat)
    const lows = segment.map(c => c.low);
    const support = Math.min(...lows);
    
    // Check if most lows are near the support level
    const lowsNearSupport = lows.filter(l => 
      Math.abs(l - support) / support < tolerance
    ).length;
    
    if (lowsNearSupport < period * 0.4) continue;

    // Find falling resistance line
    const highs = segment.map(c => c.high);
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
        type: 'descending',
        startIndex: candles.length - period,
        endIndex: candles.length - 1,
        resistance: avgLastHighs,
        support,
        confidence
      };
    }
  }

  return null;
}

function average(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
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
