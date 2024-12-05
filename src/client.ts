import axios from 'axios';
import { ethers } from 'ethers';

export class HyperliquidClient {
    private readonly baseUrl: string;
    private readonly wallet?: ethers.Wallet;

    constructor(privateKey?: string, testnet: boolean = false) {
        this.baseUrl = testnet 
            ? 'https://api.hyperliquid-testnet.xyz/info' 
            : 'https://api.hyperliquid.xyz/info';
        
        if (privateKey) {
            this.wallet = new ethers.Wallet(privateKey);
        }
    }

    async getAllMids(): Promise<any> {
        try {
            const response = await axios.post(`${this.baseUrl}/allMids`, {});
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get all mids: ${error}`);
        }
    }
}
