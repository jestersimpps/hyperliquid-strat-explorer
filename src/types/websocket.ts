export interface WsSubscription {
  method: 'subscribe' | 'unsubscribe';
  subscription: {
    type: string;
    user?: string;
    coin?: string;
    interval?: string;
  };
}

export interface WsLevel {
  px: string; // price
  sz: string; // size
  n: number;  // number of orders
}

export interface WsBook {
  coin: string;
  levels: [Array<WsLevel>, Array<WsLevel>];
  time: number;
}

export interface WsTrade {
  coin: string;
  side: string;
  px: string;
  sz: string;
  hash: string;
  time: number;
  tid: number; // ID unique across all assets
}

export interface Notification {
  notification: string;
}

export interface AllMids {
  mids: Record<string, string>;
}

export interface Candle {
  t: number; // open millis
  T: number; // close millis
  s: string; // coin
  i: string; // interval
  o: number; // open price
  c: number; // close price
  h: number; // high price
  l: number; // low price
  v: number; // volume (base unit)
  n: number; // number of trades
}

export interface WsFill {
  coin: string;
  px: string; // price
  sz: string; // size
  side: string;
  time: number;
  startPosition: string;
  dir: string; // used for frontend display
  closedPnl: string;
  hash: string; // L1 transaction hash
  oid: number; // order id
  crossed: boolean; // whether order crossed the spread (was taker)
  fee: string; // negative means rebate
  tid: number; // unique trade id
  liquidation?: FillLiquidation;
  feeToken: string; // the token the fee was paid in
  builderFee?: string; // amount paid to builder, also included in fee
}

export interface FillLiquidation {
  liquidatedUser?: string;
  markPx: number;
  method: "market" | "backstop";
}

export interface WsUserFunding {
  time: number;
  coin: string;
  usdc: string;
  szi: string;
  fundingRate: string;
}

export interface WsLiquidation {
  lid: number;
  liquidator: string;
  liquidated_user: string;
  liquidated_ntl_pos: string;
  liquidated_account_value: string;
}

export interface WsOrder {
  order: WsBasicOrder;
  status: string; // Possible values: open, filled, canceled, triggered, rejected, marginCanceled
  statusTimestamp: number;
}

export interface WsBasicOrder {
  coin: string;
  side: string;
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  origSz: string;
  cloid: string | undefined;
}

export interface WsActiveAssetCtx {
  coin: string;
  ctx: PerpsAssetCtx;
}

export interface WsActiveSpotAssetCtx {
  coin: string;
  ctx: SpotAssetCtx;
}

export type SharedAssetCtx = {
  dayNtlVlm: number;
  prevDayPx: number;
  markPx: number;
  midPx?: number;
};

export type PerpsAssetCtx = SharedAssetCtx & {
  funding: number;
  openInterest: number;
  oraclePx: number;
};

export type SpotAssetCtx = SharedAssetCtx & {
  circulatingSupply: number;
};

export interface WsActiveAssetData {
  user: string;
  coin: string;
  leverage: string;
  maxTradeSzs: [number, number];
  availableToTrade: [number, number];
}

export type WsUserEvent = 
  | { fills: WsFill[] }
  | { funding: WsUserFunding }
  | { liquidation: WsLiquidation }
  | { nonUserCancel: WsNonUserCancel[] };

export interface WsUserFills {
  isSnapshot?: boolean;
  user: string;
  fills: Array<WsFill>;
}

export interface WsNonUserCancel {
  coin: String;
  oid: number;
}

export interface WsUserNonFundingLedgerUpdate {
  time: number;
  hash: string;
  delta: WsLedgerUpdate;
}

export type WsLedgerUpdate =
  | WsDeposit
  | WsWithdraw
  | WsInternalTransfer
  | WsSubAccountTransfer
  | WsLedgerLiquidation
  | WsVaultDelta
  | WsVaultWithdrawal
  | WsVaultLeaderCommission
  | WsSpotTransfer
  | WsAccountClassTransfer
  | WsSpotGenesis
  | WsRewardsClaim;

export interface WsDeposit {
  type: "deposit";
  usdc: number;
}

export interface WsWithdraw {
  type: "withdraw";
  usdc: number;
  nonce: number;
  fee: number;
}

export interface WsInternalTransfer {
  type: "internalTransfer";
  usdc: number;
  user: string;
  destination: string;
  fee: number;
}

export interface WsSubAccountTransfer {
  type: "subAccountTransfer";
  usdc: number;
  user: string;
  destination: string;
}

export interface WsLedgerLiquidation {
  type: "liquidation";
  accountValue: number;
  leverageType: "Cross" | "Isolated";
  liquidatedPositions: Array<LiquidatedPosition>;
}

export interface LiquidatedPosition {
  coin: string;
  szi: number;
}

export interface WsVaultDelta {
  type: "vaultCreate" | "vaultDeposit" | "vaultDistribution";
  vault: string;
  usdc: number;
}

export interface WsVaultWithdrawal {
  type: "vaultWithdraw";
  vault: string;
  user: string;
  requestedUsd: number;
  commission: number;
  closingCost: number;
  basis: number;
  netWithdrawnUsd: number;
}

export interface WsVaultLeaderCommission {
  type: "vaultLeaderCommission";
  user: string;
  usdc: number;
}

export interface WsSpotTransfer {
  type: "spotTransfer";
  token: string;
  amount: number;
  usdcValue: number;
  user: string;
  destination: string;
  fee: number;
}

export interface WsAccountClassTransfer {
  type: "accountClassTransfer";
  usdc: number;
  toPerp: boolean;
}

export interface WsSpotGenesis {
  type: "spotGenesis";
  token: string;
  amount: number;
}

export interface WsRewardsClaim {
  type: "rewardsClaim";
  amount: number;
}

export type WsMessage = {
  channel: string;
  data: any;
};
