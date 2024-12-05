import { 
  MetaResponse, 
  AccountState, 
  AssetContext, 
  Position,
  SpotMetaResponse,
  SpotAssetContext,
  SpotAccountState,
  CancelResponse,
  OrderRequest,
  OrderResponse
} from '../types/hyperliquid';

import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.API_URL || 'https://api.hyperliquid.xyz/info';
const EXCHANGE_URL = process.env.EXCHANGE_URL || 'https://api.hyperliquid.xyz/exchange';

export class HyperliquidAPI {
  private async post(body: any): Promise<any> {
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

  async getMeta(): Promise<MetaResponse> {
    return this.post({ type: 'meta' });
  }

  async getMetaAndAssetCtxs(): Promise<[MetaResponse, AssetContext[]]> {
    return this.post({ type: 'metaAndAssetCtxs' });
  }

  async getAccountState(userAddress: string): Promise<AccountState> {
    return this.post({
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
    return this.post({
      type: 'userFunding',
      user: userAddress,
      startTime,
      endTime,
    });
  }

  async getHistoricalFunding(coin: string, startTime: number, endTime?: number) {
    return this.post({
      type: 'fundingHistory',
      coin,
      startTime,
      endTime,
    });
  }

  // Spot Market Methods
  async getSpotMeta(): Promise<SpotMetaResponse> {
    return this.post({
      type: 'spotMeta'
    });
  }

  async getSpotMetaAndAssetCtxs(): Promise<[SpotMetaResponse, SpotAssetContext[]]> {
    return this.post({
      type: 'spotMetaAndAssetCtxs'
    });
  }

  async getSpotAccountState(userAddress: string): Promise<SpotAccountState> {
    return this.post({
      type: 'spotClearinghouseState',
      user: userAddress.toLowerCase()
    });
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return this.post({
      type: 'order',
      orders: [order],
      grouping: 'na'
    });
  }

  async cancelOrders(cancels: Array<{asset: number, oid: number}>): Promise<CancelResponse> {
    return this.post({
      type: 'cancel',
      cancels: cancels.map(({asset, oid}) => ({
        a: asset,
        o: oid
      }))
    });
  }
}
