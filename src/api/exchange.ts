import { 
  OrderRequest,
  OrderResponse,
  CancelResponse,
  WithdrawRequest,
  UsdSendRequest,
  SpotSendRequest,
  UpdateLeverageRequest,
  UpdateIsolatedMarginRequest,
  VaultTransferRequest,
  ApproveAgentRequest,
  ApproveBuilderFeeRequest
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

  async cancelOrdersByCloid(cancels: Array<{asset: number, cloid: string}>): Promise<CancelResponse> {
    return this.post(EXCHANGE_URL, {
      type: 'cancelByCloid',
      cancels: cancels.map(({asset, cloid}) => ({
        asset,
        cloid
      }))
    });
  }

  async withdraw(request: WithdrawRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async sendUsd(request: UsdSendRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async sendSpot(request: SpotSendRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async updateLeverage(request: UpdateLeverageRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async updateIsolatedMargin(request: UpdateIsolatedMarginRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async vaultTransfer(request: VaultTransferRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async approveAgent(request: ApproveAgentRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }

  async approveBuilderFee(request: ApproveBuilderFeeRequest): Promise<void> {
    return this.post(EXCHANGE_URL, request);
  }
}
