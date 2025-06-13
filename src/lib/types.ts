import type React from 'react';

export type CryptoSymbol = 'BTC' | 'ETH';

export interface CryptoAssetInfo {
  id: CryptoSymbol;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface PriceData {
  price: number;
  timestamp: number;
}

export interface HistoricalDataPoint {
  time: number; // epoch milliseconds
  price: number; 
}

export interface AssetHolding {
  assetId: CryptoSymbol;
  amount: number;
  avgBuyPrice: number; // Weighted average buy price
  targetSellPrice?: number; // Store target sell price for 3% profit
}

export interface Portfolio {
  cashUSD: number;
  holdings: AssetHolding[];
}

export interface TradeLog {
  timestamp: number;
  message: string;
  type: 'buy' | 'sell' | 'info' | 'error' | 'ai';
}

export interface ChartDataItem {
  date: string; // Formatted for chart label e.g., "MMM D, HH:mm"
  BTC?: number;
  ETH?: number;
  btcDip?: boolean;
  ethDip?: boolean;
}

export interface DipSignal {
  assetId: CryptoSymbol;
  timestamp: number; // when the dip was identified relative to historical data
  priceAtDip: number;
  score: number;
}

export interface MarketData {
  [BTC_SYMBOL]?: PriceData;
  [ETH_SYMBOL]?: PriceData;
}

export interface RobinhoodOrder {
  id: string;
  symbol: CryptoSymbol;
  side: 'buy' | 'sell';
  quantity: number;
  price: number; // Execution price or limit price
  status: 'pending' | 'filled' | 'cancelled' | 'failed';
  createdAt: number;
}
