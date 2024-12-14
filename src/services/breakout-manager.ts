import { WsCandle } from '../types/websocket';
import { BreakoutSignal } from '../types/breakout';
import { BreakoutStrategy } from '../strategies/breakout';
import { UIComponents } from '../ui/symbol-display';
import { CronUIComponents } from '../ui/cron-display';
import { playSound } from '../utils/sound';
import { updateBreakoutBox } from '../ui/symbol-display';

export class BreakoutManager {
    private strategies: Map<string, BreakoutStrategy>;
    private breakoutSignals: Map<string, BreakoutSignal>;

    getSignal(symbol: string): BreakoutSignal | null {
        return this.breakoutSignals.get(symbol) || null;
    }

    constructor(
        private ui: UIComponents | CronUIComponents,
        symbols: string[]
    ) {
        this.strategies = new Map(symbols.map(s => [s, new BreakoutStrategy()]));
        this.breakoutSignals = new Map();
    }

    processCandles(symbol: string, candles: WsCandle[]): void {
        const strategy = this.strategies.get(symbol);
        if (!strategy) {
            throw new Error(`Strategy not found for ${symbol}`);
        }

        const breakoutSignal = strategy.detectBreakout(candles);
        
        if (breakoutSignal) {
            this.breakoutSignals.set(symbol, breakoutSignal);
            if (breakoutSignal.confidence > 0.8) {
                playSound('breakout');
                this.ui.screen.log(
                    `🚨 HIGH CONFIDENCE BREAKOUT on ${symbol}!\n` +
                    `Type: ${breakoutSignal.type} | ` +
                    `Price: ${breakoutSignal.price.toFixed(2)} | ` +
                    `Confidence: ${(breakoutSignal.confidence * 100).toFixed(1)}%`
                );
            }
        } else {
            this.breakoutSignals.delete(symbol);
        }

        updateBreakoutBox(this.ui.breakoutBox, this.breakoutSignals);
    }
}
