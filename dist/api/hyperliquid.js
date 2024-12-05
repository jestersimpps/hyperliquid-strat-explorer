"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperliquidAPI = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_URL = process.env.API_URL || 'https://api.hyperliquid.xyz/info';
const EXCHANGE_URL = process.env.EXCHANGE_URL || 'https://api.hyperliquid.xyz/exchange';
class HyperliquidAPI {
    async post(body) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        return response.json();
    }
    async getMeta() {
        return this.post({ type: 'meta' });
    }
    async getMetaAndAssetCtxs() {
        return this.post({ type: 'metaAndAssetCtxs' });
    }
    async getAccountState(userAddress) {
        return this.post({
            type: 'clearinghouseState',
            user: userAddress.toLowerCase(),
        });
    }
    async getAccountValue(userAddress) {
        const state = await this.getAccountState(userAddress);
        return state.marginSummary.accountValue;
    }
    async getOpenPositions(userAddress) {
        const state = await this.getAccountState(userAddress);
        return state.assetPositions.map(ap => ap.position);
    }
    async getFundingHistory(userAddress, startTime, endTime) {
        return this.post({
            type: 'userFunding',
            user: userAddress,
            startTime,
            endTime,
        });
    }
    async getHistoricalFunding(coin, startTime, endTime) {
        return this.post({
            type: 'fundingHistory',
            coin,
            startTime,
            endTime,
        });
    }
    // Spot Market Methods
    async getSpotMeta() {
        return this.post({
            type: 'spotMeta'
        });
    }
    async getSpotMetaAndAssetCtxs() {
        return this.post({
            type: 'spotMetaAndAssetCtxs'
        });
    }
    async getSpotAccountState(userAddress) {
        return this.post({
            type: 'spotClearinghouseState',
            user: userAddress.toLowerCase()
        });
    }
    async placeOrder(order) {
        return this.post({
            type: 'order',
            orders: [order],
            grouping: 'na'
        });
    }
    async cancelOrders(cancels) {
        return this.post({
            type: 'cancel',
            cancels: cancels.map(({ asset, oid }) => ({
                a: asset,
                o: oid
            }))
        });
    }
}
exports.HyperliquidAPI = HyperliquidAPI;
