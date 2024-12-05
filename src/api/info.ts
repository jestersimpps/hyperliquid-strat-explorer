import { 
  MetaResponse, 
  AccountState, 
  AssetContext,
  SpotMetaResponse,
  SpotAssetContext,
  SpotAccountState,
} from '../types/hyperliquid';
import { BaseAPI } from './base';

import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.API_URL || 'https://api.hyperliquid.xyz/info';

export class HyperliquidInfoAPI extends BaseAPI {
  async getMeta(): Promise<MetaResponse> {
    return this.post(API_URL, { type: 'meta' });
  }

  async getMetaAndAssetCtxs(): Promise<[MetaResponse, AssetContext[]]> {
    return this.post(API_URL, { type: 'metaAndAssetCtxs' });
  }

  async getAccountState(userAddress: string): Promise<AccountState> {
    return this.post(API_URL, {
      type: 'clearinghouseState',
      user: userAddress.toLowerCase(),
    });
  }

  async getAccountValue(userAddress: string): Promise<string> {
    const state = await this.getAccountState(userAddress);
    return state.marginSummary.accountValue;
  }

  async getOpenPositions(userAddress: string): Promise<Position[]> {
    const state = await this.getAccountState(userAddress);
    return state.assetPositions.map(ap => ap.position);
  }

  async getFundingHistory(userAddress: string, startTime: number, endTime?: number) {
    return this.post(API_URL, {
      type: 'userFunding',
      user: userAddress,
      startTime,
      endTime,
    });
  }

  async getHistoricalFunding(coin: string, startTime: number, endTime?: number) {
    return this.post(API_URL, {
      type: 'fundingHistory',
      coin,
      startTime,
      endTime,
    });
  }

  // Spot Market Methods
  async getSpotMeta(): Promise<SpotMetaResponse> {
    return this.post(API_URL, {
      type: 'spotMeta'
    });
  }

  async getSpotMetaAndAssetCtxs(): Promise<[SpotMetaResponse, SpotAssetContext[]]> {
    return this.post(API_URL, {
      type: 'spotMetaAndAssetCtxs'
    });
  }

  async getSpotAccountState(userAddress: string): Promise<SpotAccountState> {
    return this.post(API_URL, {
      type: 'spotClearinghouseState',
      user: userAddress.toLowerCase()
    });
  }
}
