import { HyperliquidInfoAPI } from './api/info';
import { HyperliquidWebSocketAPI } from './api/websocket';
import { createUIComponents } from './ui/components';
import { WebSocketHandler } from './services/websocket-handler';
import { ChartManager } from './services/chart-manager';
import { BreakoutManager } from './services/breakout-manager';

async function main() {
    const symbols = ['BTC', 'HYPE'];
    const interval = '5m';
    const oneHourMs = 24 * 60 * 60 * 1000;

    try {
        // Initialize components
        const ui = createUIComponents(symbols);
        const api = new HyperliquidInfoAPI();
        const wsApi = new HyperliquidWebSocketAPI(api);
        const chartManager = new ChartManager(ui, symbols);
        const breakoutManager = new BreakoutManager(ui, symbols);
        const wsHandler = new WebSocketHandler(wsApi, ui, chartManager, breakoutManager);

        // Connect to WebSocket
        await wsApi.connect();

        // Subscribe to symbols
        for (const symbol of symbols) {
            await wsHandler.subscribeToSymbol(symbol, interval, oneHourMs);
        }

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
