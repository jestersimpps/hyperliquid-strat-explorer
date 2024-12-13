export interface TimeInterval {
    value: number;
    unit: 'm' | 'h' | 'd';
}

export function parseInterval(interval: string): TimeInterval {
    const match = interval.match(/^(\d+)([mhd])$/);
    if (!match) {
        throw new Error('Invalid interval format. Use format like 5m, 1h, 1d');
    }
    return {
        value: parseInt(match[1], 10),
        unit: match[2] as 'm' | 'h' | 'd'
    };
}

export function intervalToMs(interval: TimeInterval): number {
    const multipliers = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };
    return interval.value * multipliers[interval.unit];
}

export function calculateTimeframe(interval: string): number {
    const parsedInterval = parseInterval(interval);
    const intervalMs = intervalToMs(parsedInterval);
    const maxCandles = 1000;
    return intervalMs * maxCandles;
}
