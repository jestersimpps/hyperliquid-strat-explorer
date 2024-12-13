"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSupportResistance = detectSupportResistance;
function linearRegression(points) {
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
        },
        strength: 0.1 // Default minimal strength for regression lines
    };
}
function findBestFittingLine(points, tolerance) {
    let bestLine = null;
    let maxPoints = 0;
    let strength = 0;
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
                strength = pointsNearLine / points.length;
                bestLine = {
                    start: points[i],
                    end: points[j],
                    strength
                };
            }
        }
    }
    if (bestLine) {
        return bestLine;
    }
    // Fallback to linear regression with minimal strength
    const regression = linearRegression(points);
    return { ...regression, strength: 0.1 };
}
function calculateLineScore(line, points, tolerance) {
    let score = 0;
    for (const point of points) {
        const slope = (line.end.y - line.start.y) / (line.end.x - line.start.x);
        const intercept = line.start.y - slope * line.start.x;
        const expectedY = slope * point.x + intercept;
        if (Math.abs(point.y - expectedY) <= tolerance) {
            score++;
        }
    }
    return score;
}
function detectSupportResistance(candles, tolerance = 0.01 // 1% tolerance for point-to-line distance
) {
    // Try different chunk sizes from 5% to 20% of total candles
    const minChunkSize = Math.max(5, Math.floor(candles.length * 0.05));
    const maxChunkSize = Math.max(10, Math.floor(candles.length * 0.20));
    const chunkSizes = Array.from({ length: 5 }, (_, i) => Math.floor(minChunkSize + (maxChunkSize - minChunkSize) * (i / 4)));
    let bestSupport = null;
    let bestResistance = null;
    let bestSupportScore = -1;
    let bestResistanceScore = -1;
    for (const chunkSize of chunkSizes) {
        const chunks = [];
        for (let i = 0; i < candles.length; i += chunkSize) {
            chunks.push(candles.slice(i, i + chunkSize));
        }
        const lowPoints = chunks.map((chunk, chunkIndex) => ({
            x: chunkIndex * chunkSize,
            y: Math.min(...chunk.map(c => parseFloat(c.l)))
        }));
        const highPoints = chunks.map((chunk, chunkIndex) => ({
            x: chunkIndex * chunkSize,
            y: Math.max(...chunk.map(c => parseFloat(c.h)))
        }));
        const support = findBestFittingLine(lowPoints, tolerance);
        const resistance = findBestFittingLine(highPoints, tolerance);
        const supportScore = calculateLineScore(support, lowPoints, tolerance);
        const resistanceScore = calculateLineScore(resistance, highPoints, tolerance);
        if (supportScore > bestSupportScore) {
            bestSupportScore = supportScore;
            bestSupport = support;
        }
        if (resistanceScore > bestResistanceScore) {
            bestResistanceScore = resistanceScore;
            bestResistance = resistance;
        }
    }
    return {
        support: bestSupport,
        resistance: bestResistance
    };
}
