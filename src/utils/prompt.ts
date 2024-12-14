import * as readline from 'readline';

export async function promptForSymbol(): Promise<string> {
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

export async function promptForInterval(): Promise<string> {
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

export async function promptForMaxCandles(): Promise<number> {
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

export async function promptForTopSymbols(): Promise<number> {
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
