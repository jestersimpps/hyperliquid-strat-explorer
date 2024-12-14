"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBreakoutBox = updateBreakoutBox;
exports.updateChart = updateChart;
const shared_updater_1 = require("./shared-updater");
function updateBreakoutBox(breakoutBox, breakoutSignals) {
    (0, shared_updater_1.updateBreakoutBox)(breakoutBox, breakoutSignals);
}
function updateChart(chart, data, symbol) {
    (0, shared_updater_1.updateChart)(chart, data);
}
