import { HyperliquidAPI } from './api/hyperliquid';

async function main() {
    const api = new HyperliquidAPI();
    const address = 'YOUR_WALLET_ADDRESS'; // We'll need to replace this with your actual address
    
    try {
        console.log('Fetching account information...');
        
        const accountValue = await api.getAccountValue(address);
        const positions = await api.getOpenPositions(address);
        const accountState = await api.getAccountState(address);
        
        console.log('\nAccount Summary:');
        console.log('----------------');
        console.log(`Account Value: $${accountValue}`);
        console.log(`Withdrawable: $${accountState.withdrawable}`);
        console.log(`Total Margin Used: $${accountState.marginSummary.totalMarginUsed}`);
        
        console.log('\nOpen Positions:');
        console.log('---------------');
        if (positions.length === 0) {
            console.log('No open positions');
        } else {
            positions.forEach(position => {
                console.log(`\nCoin: ${position.coin}`);
                console.log(`Position Value: $${position.positionValue}`);
                console.log(`Entry Price: $${position.entryPx}`);
                console.log(`Unrealized PnL: $${position.unrealizedPnl}`);
                console.log(`Leverage: ${position.leverage.value}x (${position.leverage.type})`);
            });
        }
    } catch (error) {
        console.error('Error fetching account information:', error);
    }
}

main().catch(console.error);
