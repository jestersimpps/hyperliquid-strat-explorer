import { HyperliquidClient } from './client';

async function main() {
    const client = new HyperliquidClient();
    
    try {
        const allMids = await client.getAllMids();
        console.log('All mids:', allMids);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
