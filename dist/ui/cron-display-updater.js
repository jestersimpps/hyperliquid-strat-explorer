"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChart = exports.updateBreakoutBox = void 0;
exports.updateTable = updateTable;
var shared_updater_1 = require("./shared-updater");
Object.defineProperty(exports, "updateBreakoutBox", { enumerable: true, get: function () { return shared_updater_1.updateBreakoutBox; } });
Object.defineProperty(exports, "updateChart", { enumerable: true, get: function () { return shared_updater_1.updateChart; } });
function updateTable(table, data) {
    const headers = [
        "Symbol",
        "Price",
        "24h Change",
        "Volume",
        "Confidence",
        "Signal",
    ];
    const rows = data.map((metric) => [
        metric.symbol,
        metric.currentPrice.toFixed(2),
        (metric.priceChange >= 0 ? "+" : "") + metric.priceChange.toFixed(2) + "%",
        (metric.volumeUSD / 1000000).toFixed(2) + "M",
        (metric.breakoutMetrics.confidence * 100).toFixed(1) + "%",
        metric.breakoutMetrics.type || "NONE",
    ]);
    table.setData({
        headers,
        data: rows,
    });
}
