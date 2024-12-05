import { HyperliquidAPI } from './api/hyperliquid';

async function main() {
    const api = new HyperliquidAPI();
    const address = '0xF51182207e3687985471E0da21CaCf5FfC552E5d';
    
    try {
        console.log('Fetching account information...\n');
        
        // Fetch perpetuals account info
        console.log('Perpetuals Account:');
        console.log('-------------------');
        
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
        // Fetch spot account info
        console.log('\nSpot Account:');
        console.log('-------------');
        const spotState = await api.getSpotAccountState(address);
        
        if (spotState.balances.length === 0) {
            console.log('No spot balances');
        } else {
            spotState.balances.forEach(balance => {
                console.log(`\nToken: ${balance.coin}`);
                console.log(`Total Balance: ${balance.total}`);
                console.log(`Hold: ${balance.hold}`);
                console.log(`Entry Notional: ${balance.entryNtl}`);
            });
        }
    } catch (error) {
        console.error('Error fetching account information:', error);
    }
}

main().catch(console.error);
