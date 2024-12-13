import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';
import { createUIComponents } from './ui/components';
import { WebSocketHandler } from './services/websocket-handler';
import { ChartManager } from './services/chart-manager';
import { BreakoutManager } from './services/breakout-manager';
import { promptForSymbol } from './utils/prompt';

async function main() {
    const interval = '5m';
    const oneHourMs = 24 * 60 * 60 * 1000;

    try {
        // Get symbol from user
        const symbol = await promptForSymbol();
        
        // Initialize components
        const ui = createUIComponents([symbol]);
        const api = new HyperliquidInfoAPI();
        const wsApi = new HyperliquidWebSocketAPI(api);
        const chartManager = new ChartManager(ui, [symbol]);
        const breakoutManager = new BreakoutManager(ui, [symbol]);
        const wsHandler = new WebSocketHandler(wsApi, ui, chartManager, breakoutManager);

        // Connect to WebSocket
        await wsApi.connect();

        // Subscribe to symbol
        await wsHandler.subscribeToSymbol(symbol, interval, oneHourMs);

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await wsApi.close();
                ui.screen.destroy();
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });

        // Initial render
        ui.screen.render();

    } catch (error) {
        console.error(`Fatal error: ${error}`);
        process.exit(1);
    }
}

// Start the application
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
