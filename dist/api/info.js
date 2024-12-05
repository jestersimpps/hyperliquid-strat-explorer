"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperliquidInfoAPI = void 0;
const base_1 = require("./base");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_URL = process.env.API_URL || 'https://api.hyperliquid.xyz/info';
class HyperliquidInfoAPI extends base_1.BaseAPI {
    async getMeta() {
        return this.post(API_URL, { type: 'meta' });
    }
    async getMetaAndAssetCtxs() {
        return this.post(API_URL, { type: 'metaAndAssetCtxs' });
    }
    async getAccountState(userAddress) {
        return this.post(API_URL, {
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
        return this.post(API_URL, {
            type: 'userFunding',
            user: userAddress,
            startTime,
            endTime,
        });
    }
    async getHistoricalFunding(coin, startTime, endTime) {
        return this.post(API_URL, {
            type: 'fundingHistory',
            coin,
            startTime,
            endTime,
        });
    }
    // Spot Market Methods
    async getSpotMeta() {
        return this.post(API_URL, {
            type: 'spotMeta'
        });
    }
    async getSpotMetaAndAssetCtxs() {
        return this.post(API_URL, {
            type: 'spotMetaAndAssetCtxs'
        });
    }
    async getSpotAccountState(userAddress) {
        return this.post(API_URL, {
            type: 'spotClearinghouseState',
            user: userAddress.toLowerCase()
        });
    }
}
exports.HyperliquidInfoAPI = HyperliquidInfoAPI;
