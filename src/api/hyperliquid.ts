import { MetaResponse, AccountState, AssetContext } from '../types/hyperliquid';

const API_URL = 'https://api.hyperliquid.xyz/info';

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
      user: userAddress,
    });
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
}
