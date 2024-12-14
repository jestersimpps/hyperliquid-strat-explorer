import { HyperliquidInfoAPI } from './api/info';
import { playSound } from './utils/sound';
import { HyperliquidWebSocketAPI } from './api/websocket';
import { createUIComponents } from './ui/components';
import { WebSocketHandler } from './services/websocket-handler';
import { ChartManager } from './services/chart-manager';
import { BreakoutManager } from './services/breakout-manager';
import { promptForSymbol, promptForInterval, promptForMaxCandles } from './utils/prompt';
import { calculateTimeframe } from './utils/time';

async function main() {
    try {
        // Play startup sound
        playSound('startup');
        
        // Get user inputs
        const symbol = await promptForSymbol();
        const interval = await promptForInterval();
        const maxCandles = await promptForMaxCandles();
        const timeframeMs = calculateTimeframe(interval, maxCandles);
        
        // Initialize components
        const ui = createUIComponents(symbol);
        const api = new HyperliquidInfoAPI();
        const wsApi = new HyperliquidWebSocketAPI(api);
        const chartManager = new ChartManager(ui, [symbol]);
        const breakoutManager = new BreakoutManager(ui, [symbol]);
        const wsHandler = new WebSocketHandler(wsApi, ui, chartManager, breakoutManager, maxCandles);

        // Connect to WebSocket
        await wsApi.connect();

        // Subscribe to symbol
        await wsHandler.subscribeToSymbol(symbol, interval, timeframeMs);

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
