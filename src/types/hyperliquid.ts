export interface MetaResponse {
  universe: {
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }[];
}

export interface AssetContext {
  dayNtlVlm: string;
  funding: string;
  impactPxs: string[];
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

export interface Position {
  coin: string;
  cumFunding: {
    allTime: string;
    sinceChange: string;
    sinceOpen: string;
  };
  entryPx: string;
  leverage: {
    rawUsd: string;
    type: 'cross' | 'isolated';
    value: number;
  };
  liquidationPx: string;
  marginUsed: string;
  maxLeverage: number;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

export interface SpotToken {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  isCanonical: boolean;
  evmContract: string | null;
  fullName: string | null;
}

export interface SpotMarket {
  name: string;
  tokens: number[];
  index: number;
  isCanonical: boolean;
}

export interface SpotMetaResponse {
  tokens: SpotToken[];
  universe: SpotMarket[];
}

export interface SpotAssetContext {
  dayNtlVlm: string;
  markPx: string;
  midPx: string;
  prevDayPx: string;
}

export interface SpotBalance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

export interface SpotAccountState {
  balances: SpotBalance[];
}

export type OrderType = {
  limit: {
    tif: 'Alo' | 'Ioc' | 'Gtc'
  }
} | {
  trigger: {
    isMarket: boolean,
    triggerPx: string,
    tpsl: 'tp' | 'sl'
  }
}

export interface OrderRequest {
  a: number // asset
  b: boolean // isBuy
  p: string // price
  s: string // size
  r: boolean // reduceOnly
  t: OrderType
  c?: string // cloid (optional)
}

export interface OrderResponse {
  status: 'ok'
  response: {
    type: 'order'
    data: {
      statuses: Array<{
        resting?: { oid: number }
        error?: string
        filled?: {
          totalSz: string
          avgPx: string
          oid: number
        }
      }>
    }
  }
}

export interface CancelRequest {
  type: 'cancel'
  cancels: Array<{
    a: number // asset
    o: number // oid
  }>
}

export interface CancelResponse {
  status: 'ok'
  response: {
    type: 'cancel'
    data: {
      statuses: Array<'success' | { error: string }>
    }
  }
}

export interface AccountState {
  assetPositions: {
    position: Position;
    type: 'oneWay';
  }[];
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  time: number;
  withdrawable: string;
}
