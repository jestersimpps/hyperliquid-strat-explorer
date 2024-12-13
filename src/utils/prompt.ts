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
