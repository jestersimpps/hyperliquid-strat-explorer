"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const info_1 = require("./api/info");
const sound_1 = require("./utils/sound");
const websocket_1 = require("./api/websocket");
const components_1 = require("./ui/components");
const websocket_handler_1 = require("./services/websocket-handler");
const chart_manager_1 = require("./services/chart-manager");
const breakout_manager_1 = require("./services/breakout-manager");
const prompt_1 = require("./utils/prompt");
const time_1 = require("./utils/time");
async function main() {
    try {
        // Clear console
        console.clear();
        // Play startup sound
        (0, sound_1.playSound)('startup');
        // Get user inputs
        const symbol = await (0, prompt_1.promptForSymbol)();
        const interval = await (0, prompt_1.promptForInterval)();
        const maxCandles = await (0, prompt_1.promptForMaxCandles)();
        const timeframeMs = (0, time_1.calculateTimeframe)(interval, maxCandles);
        // Initialize components
        const ui = (0, components_1.createUIComponents)(symbol);
        const api = new info_1.HyperliquidInfoAPI();
        const wsApi = new websocket_1.HyperliquidWebSocketAPI(api);
        const chartManager = new chart_manager_1.ChartManager(ui, [symbol]);
        const breakoutManager = new breakout_manager_1.BreakoutManager(ui, [symbol]);
        const wsHandler = new websocket_handler_1.WebSocketHandler(wsApi, ui, chartManager, breakoutManager, maxCandles);
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
            }
            catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
        // Initial render
        ui.screen.render();
    }
    catch (error) {
        console.error(`Fatal error: ${error}`);
        process.exit(1);
    }
}
// Start the application
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
