import { 
  OrderRequest,
  OrderResponse,
  CancelResponse
} from '../types/hyperliquid';
import { BaseAPI } from './base';

import dotenv from 'dotenv';
dotenv.config();

const EXCHANGE_URL = process.env.EXCHANGE_URL || 'https://api.hyperliquid.xyz/exchange';

export class HyperliquidExchangeAPI extends BaseAPI {
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return this.post(EXCHANGE_URL, {
      type: 'order',
      orders: [order],
      grouping: 'na'
    });
  }

  async cancelOrders(cancels: Array<{asset: number, oid: number}>): Promise<CancelResponse> {
    return this.post(EXCHANGE_URL, {
      type: 'cancel',
      cancels: cancels.map(({asset, oid}) => ({
        a: asset,
        o: oid
      }))
    });
  }
}
