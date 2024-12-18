"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakoutManager = void 0;
const breakout_1 = require("../strategies/breakout");
const sound_1 = require("../utils/sound");
const shared_updater_1 = require("../ui/shared-updater");
class BreakoutManager {
    ui;
    strategies;
    breakoutSignals;
    getSignal(symbol) {
        return this.breakoutSignals.get(symbol) || null;
    }
    constructor(ui, symbols) {
        this.ui = ui;
        this.strategies = new Map(symbols.map((s) => [s, new breakout_1.BreakoutStrategy()]));
        this.breakoutSignals = new Map();
    }
    processCandles(symbol, candles) {
        const strategy = this.strategies.get(symbol);
        if (!strategy) {
            throw new Error(`Strategy not found for ${symbol}`);
        }
        const breakoutSignal = strategy.detectBreakout(symbol, candles);
        if (breakoutSignal) {
            this.breakoutSignals.set(symbol, breakoutSignal);
            if (breakoutSignal.confidence > 0.7) {
                (0, sound_1.playSound)("breakout");
                this.ui.screen.log(`🚨 HIGH CONFIDENCE BREAKOUT on ${symbol}!\n` +
                    `Type: ${breakoutSignal.type} | ` +
                    `Price: ${breakoutSignal.price.toFixed(2)} | ` +
                    `Confidence: ${(breakoutSignal.confidence * 100).toFixed(1)}%`);
            }
        }
        else {
            this.breakoutSignals.delete(symbol);
        }
        (0, shared_updater_1.updateBreakoutBox)(this.ui.breakoutBox, this.breakoutSignals);
    }
}
exports.BreakoutManager = BreakoutManager;
