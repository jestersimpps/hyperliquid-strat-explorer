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

export async function promptForTimeframe(): Promise<number> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter timeframe in hours (e.g., 24): ', (answer) => {
            rl.close();
            const hours = parseInt(answer, 10) || 24; // default to 24 if invalid input
            resolve(hours * 60 * 60 * 1000); // convert to milliseconds
        });
    });
}
