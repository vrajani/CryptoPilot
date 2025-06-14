export const MAX_INVESTMENT_USD = 2000;
export const PROFIT_TARGET_PERCENTAGE = 0.03; // 3%
export const ALGORITHM_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const DIP_SCORE_THRESHOLD = 70; // Minimum dip score to consider buying

export const BTC_SYMBOL = 'BTC';
export const ETH_SYMBOL = 'ETH';

export const CRYPTO_ASSETS = [
  { id: BTC_SYMBOL, usdSymbol: 'BTC-USD', name: 'Bitcoin' },
  { id: ETH_SYMBOL, usdSymbol: 'ETH-USD', name: 'Ethereum' },
];

// For mock historical data generation
export const HISTORICAL_DATA_POINTS = 7 * 24; // 7 days, 1 data point per hour
export const MOCK_BTC_BASE_PRICE = 60000;
export const MOCK_ETH_BASE_PRICE = 3000;
export const MOCK_PRICE_VOLATILITY = 0.02; // 2% volatility for mock data
