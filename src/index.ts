import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';
import { WsTrade } from './types/websocket';

async function main() {
    // Set up WebSocket connection for BTC trades
    const wsApi = new HyperliquidWebSocketAPI();
    await wsApi.subscribeToTrades('BTC', (trade: WsTrade) => {
        console.log(`[${new Date(trade.time).toISOString()}] BTC Trade:`, {
            price: `$${trade.px}`,
            size: trade.sz,
            side: trade.side,
            id: trade.tid
        });
    });
    const api = new HyperliquidInfoAPI();
    const address = process.env.WALLET_ADDRESS || '';
    
    if (!address) {
        throw new Error('WALLET_ADDRESS not set in environment variables');
    }
    
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
            spotState.balances.forEach((balance) => {
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
