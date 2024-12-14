"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptForSymbol = promptForSymbol;
exports.promptForInterval = promptForInterval;
exports.promptForMaxCandles = promptForMaxCandles;
exports.promptForTopSymbols = promptForTopSymbols;
const readline = __importStar(require("readline"));
async function promptForSymbol() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question('Enter trading symbol (e.g., BTC): ', (answer) => {
            rl.close();
            resolve(answer.toUpperCase());
        });
    });
}
async function promptForInterval() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question('Enter candle interval (e.g., 5m, 15m, 1h): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase());
        });
    });
}
async function promptForMaxCandles() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question('Enter max number of candles (default: 200): ', (answer) => {
            rl.close();
            const maxCandles = parseInt(answer, 10);
            resolve(isNaN(maxCandles) ? 200 : maxCandles);
        });
    });
}
async function promptForTopSymbols() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question('Enter number of top symbols to monitor (default: 30): ', (answer) => {
            rl.close();
            const topX = parseInt(answer, 10);
            resolve(isNaN(topX) ? 30 : topX);
        });
    });
}
