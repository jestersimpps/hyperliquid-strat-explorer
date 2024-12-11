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
    async cancelOrdersByCloid(cancels) {
        return this.post(EXCHANGE_URL, {
            type: 'cancelByCloid',
            cancels: cancels.map(({ asset, cloid }) => ({
                asset,
                cloid
            }))
        });
    }
    async withdraw(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async sendUsd(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async sendSpot(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async updateLeverage(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async updateIsolatedMargin(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async vaultTransfer(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async approveAgent(request) {
        return this.post(EXCHANGE_URL, request);
    }
    async approveBuilderFee(request) {
        return this.post(EXCHANGE_URL, request);
    }
}
exports.HyperliquidExchangeAPI = HyperliquidExchangeAPI;
