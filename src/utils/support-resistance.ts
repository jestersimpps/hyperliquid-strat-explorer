import { WsCandle } from '../types/websocket';

interface Point {
  x: number;  // index/time
  y: number;  // price
}

interface Line {
  start: Point;
  end: Point;
}

interface SupportResistanceLines {
  support: Line;
  resistance: Line;
}

function linearRegression(points: Point[]): Line {
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    start: {
      x: points[0].x,
      y: slope * points[0].x + intercept
    },
    end: {
      x: points[points.length - 1].x,
      y: slope * points[points.length - 1].x + intercept
    }
  };
}

function findBestFittingLine(points: Point[], tolerance: number): Line {
  let bestLine: Line | null = null;
  let maxPoints = 0;

  // Try each pair of points as potential line endpoints
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const slope = (points[j].y - points[i].y) / (points[j].x - points[i].x);
      const intercept = points[i].y - slope * points[i].x;

      // Count points close to this line
      let pointsNearLine = 0;
      for (const point of points) {
        const expectedY = slope * point.x + intercept;
        if (Math.abs(point.y - expectedY) <= tolerance) {
          pointsNearLine++;
        }
      }

      if (pointsNearLine > maxPoints) {
        maxPoints = pointsNearLine;
        bestLine = {
          start: points[i],
          end: points[j]
        };
      }
    }
  }

  return bestLine || linearRegression(points);
}

export function detectSupportResistance(
  candles: WsCandle[], 
  chunkSize: number = 10,
  tolerance: number = 0.01  // 1% tolerance for point-to-line distance
): SupportResistanceLines {
  const chunks: WsCandle[][] = [];
  
  // Split candles into chunks
  for (let i = 0; i < candles.length; i += chunkSize) {
    chunks.push(candles.slice(i, i + chunkSize));
  }

  // Find lowest lows and highest highs in each chunk
  const lowPoints: Point[] = chunks.map((chunk, chunkIndex) => ({
    x: chunkIndex * chunkSize,
    y: Math.min(...chunk.map(c => parseFloat(c.l)))
  }));

  const highPoints: Point[] = chunks.map((chunk, chunkIndex) => ({
    x: chunkIndex * chunkSize,
    y: Math.max(...chunk.map(c => parseFloat(c.h)))
  }));

  // Find best fitting lines
  const support = findBestFittingLine(lowPoints, tolerance);
  const resistance = findBestFittingLine(highPoints, tolerance);

  return { support, resistance };
}
