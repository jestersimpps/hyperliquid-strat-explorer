"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperliquidClient = void 0;
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
class HyperliquidClient {
    baseUrl;
    wallet;
    constructor(privateKey, testnet = false) {
        this.baseUrl = testnet
            ? 'https://api.hyperliquid-testnet.xyz/info'
            : 'https://api.hyperliquid.xyz/info';
        if (privateKey) {
            this.wallet = new ethers_1.ethers.Wallet(privateKey);
        }
    }
    async getAllMids() {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/allMids`, {});
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get all mids: ${error}`);
        }
    }
}
exports.HyperliquidClient = HyperliquidClient;
