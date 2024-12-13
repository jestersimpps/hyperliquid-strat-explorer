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
