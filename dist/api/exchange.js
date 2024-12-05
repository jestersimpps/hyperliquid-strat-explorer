"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperliquidExchangeAPI = void 0;
const base_1 = require("./base");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const EXCHANGE_URL = process.env.EXCHANGE_URL || 'https://api.hyperliquid.xyz/exchange';
class HyperliquidExchangeAPI extends base_1.BaseAPI {
    async placeOrder(order) {
        return this.post(EXCHANGE_URL, {
            type: 'order',
            orders: [order],
            grouping: 'na'
        });
    }
    async cancelOrders(cancels) {
        return this.post(EXCHANGE_URL, {
            type: 'cancel',
            cancels: cancels.map(({ asset, oid }) => ({
                a: asset,
                o: oid
            }))
        });
    }
}
exports.HyperliquidExchangeAPI = HyperliquidExchangeAPI;
