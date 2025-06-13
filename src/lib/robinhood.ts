'use server';
import type { CryptoSymbol, HistoricalDataPoint, Portfolio, PriceData, RobinhoodOrder, AssetHolding, MarketData } from './types';
import { HISTORICAL_DATA_POINTS, MAX_INVESTMENT_USD, MOCK_BTC_BASE_PRICE, MOCK_ETH_BASE_PRICE, MOCK_PRICE_VOLATILITY, BTC_SYMBOL, ETH_SYMBOL } from './constants';

// --- Mock Database ---
interface MockDB {
  portfolio: Portfolio;
  marketData: MarketData;
  historicalData: {
    [key in CryptoSymbol]?: HistoricalDataPoint[];
  };
  orders: RobinhoodOrder[];
  lastPriceUpdate: number;
}

let db: MockDB = {
  portfolio: {
    cashUSD: MAX_INVESTMENT_USD,
    holdings: [],
  },
  marketData: {
    [BTC_SYMBOL]: { price: MOCK_BTC_BASE_PRICE, timestamp: Date.now() },
    [ETH_SYMBOL]: { price: MOCK_ETH_BASE_PRICE, timestamp: Date.now() },
  },
  historicalData: {},
  orders: [],
  lastPriceUpdate: Date.now(),
};

// --- Helper Functions ---
const generateHistorical = (symbol: CryptoSymbol, basePrice: number): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  for (let i = 0; i < HISTORICAL_DATA_POINTS; i++) {
    const changePercent = (Math.random() - 0.5) * 2 * MOCK_PRICE_VOLATILITY; // -VOLATILITY to +VOLATILITY
    currentPrice *= (1 + changePercent);
    currentPrice = Math.max(currentPrice, basePrice * 0.5); // Ensure price doesn't go too low
    data.unshift({
      time: now - (i * 60 * 60 * 1000), // Hourly data points
      price: parseFloat(currentPrice.toFixed(2)),
    });
  }
  return data;
};

const updateMockPrices = () => {
  const now = Date.now();
  // Only update if it's been more than a minute to avoid too frequent changes during a single algorithm run
  if (now - db.lastPriceUpdate < 60 * 1000 && Object.keys(db.marketData).length > 0) {
     // If marketData is not empty, means it has been initialized.
     // If it's empty, this is the first run, so we proceed.
    if (db.marketData[BTC_SYMBOL] && db.marketData[ETH_SYMBOL]) return;
  }

  Object.keys(db.marketData).forEach(key => {
    const symbol = key as CryptoSymbol;
    if (db.marketData[symbol]) {
      const currentPrice = db.marketData[symbol]!.price;
      const changePercent = (Math.random() - 0.45) * MOCK_PRICE_VOLATILITY * 0.5; // smaller changes for live price
      const newPrice = parseFloat((currentPrice * (1 + changePercent)).toFixed(2));
      db.marketData[symbol] = { price: newPrice, timestamp: now };

      // Add to historical data
      if (!db.historicalData[symbol]) {
        db.historicalData[symbol] = generateHistorical(symbol, symbol === BTC_SYMBOL ? MOCK_BTC_BASE_PRICE : MOCK_ETH_BASE_PRICE);
      }
      // Add new price and remove oldest if > HISTORICAL_DATA_POINTS
      db.historicalData[symbol]?.push({ time: now, price: newPrice });
      if (db.historicalData[symbol]!.length > HISTORICAL_DATA_POINTS * 2) { // Keep a bit more for smoother chart updates
        db.historicalData[symbol] = db.historicalData[symbol]!.slice(-HISTORICAL_DATA_POINTS * 2);
      }
    }
  });
  db.lastPriceUpdate = now;
};


// Initialize historical data
db.historicalData[BTC_SYMBOL] = generateHistorical(BTC_SYMBOL, MOCK_BTC_BASE_PRICE);
db.historicalData[ETH_SYMBOL] = generateHistorical(ETH_SYMBOL, MOCK_ETH_BASE_PRICE);
updateMockPrices(); // Initial price setup


// --- Mock API Functions ---

export async function getMarketData(): Promise<MarketData> {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  updateMockPrices();
  return JSON.parse(JSON.stringify(db.marketData));
}

export async function getHistoricalData(symbol: CryptoSymbol, _range: string = 'week', _interval: string = 'hour'): Promise<HistoricalDataPoint[]> {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  updateMockPrices(); // ensure historical data is current with market data
  return JSON.parse(JSON.stringify(db.historicalData[symbol] || []));
}

export async function placeOrder(symbol: CryptoSymbol, side: 'buy' | 'sell', quantity: number): Promise<RobinhoodOrder> {
  await new Promise(resolve => setTimeout(resolve, 300));
  updateMockPrices();

  const currentPrice = db.marketData[symbol]?.price;
  if (!currentPrice) {
    throw new Error(`Market data not available for ${symbol}`);
  }

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const order: RobinhoodOrder = {
    id: orderId,
    symbol,
    side,
    quantity,
    price: currentPrice, // Assuming market order filled at current price
    status: 'pending',
    createdAt: Date.now(),
  };

  const cost = quantity * currentPrice;

  if (side === 'buy') {
    if (db.portfolio.cashUSD < cost) {
      order.status = 'failed';
      db.orders.push(order);
      throw new Error('Insufficient funds');
    }
    db.portfolio.cashUSD -= cost;
    let existingHolding = db.portfolio.holdings.find(h => h.assetId === symbol);
    if (existingHolding) {
      const totalAmount = existingHolding.amount + quantity;
      existingHolding.avgBuyPrice = ((existingHolding.avgBuyPrice * existingHolding.amount) + (currentPrice * quantity)) / totalAmount;
      existingHolding.amount = totalAmount;
    } else {
      db.portfolio.holdings.push({ assetId: symbol, amount: quantity, avgBuyPrice: currentPrice });
    }
    order.status = 'filled';
  } else { // Sell
    let holdingIndex = db.portfolio.holdings.findIndex(h => h.assetId === symbol);
    if (holdingIndex === -1 || db.portfolio.holdings[holdingIndex].amount < quantity) {
      order.status = 'failed';
      db.orders.push(order);
      throw new Error('Insufficient asset balance');
    }
    db.portfolio.cashUSD += cost;
    db.portfolio.holdings[holdingIndex].amount -= quantity;
    if (db.portfolio.holdings[holdingIndex].amount === 0) {
      db.portfolio.holdings.splice(holdingIndex, 1);
    }
    order.status = 'filled';
  }

  db.orders.push(order);
  // console.log(`Order ${side} ${quantity} ${symbol} @ ${currentPrice} ${order.status}. Cash: ${db.portfolio.cashUSD}`);
  return JSON.parse(JSON.stringify(order));
}

export async function getPortfolio(): Promise<Portfolio> {
  await new Promise(resolve => setTimeout(resolve, 100));
  // No need to update prices here, portfolio is just data
  return JSON.parse(JSON.stringify(db.portfolio));
}

export async function getAccountInfo(): Promise<{ id: string; currency: string }> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return { id: 'mockAccountId123', currency: 'USD' };
}

export async function getOrders(): Promise<RobinhoodOrder[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return JSON.parse(JSON.stringify(db.orders.slice(-20).reverse())); // Last 20 orders
}

// Utility to reset mock DB for testing or re-runs if needed (not used by default)
export async function resetMockDB(): Promise<void> {
  db = {
    portfolio: {
      cashUSD: MAX_INVESTMENT_USD,
      holdings: [],
    },
    marketData: {
      [BTC_SYMBOL]: { price: MOCK_BTC_BASE_PRICE, timestamp: Date.now() },
      [ETH_SYMBOL]: { price: MOCK_ETH_BASE_PRICE, timestamp: Date.now() },
    },
    historicalData: {
        [BTC_SYMBOL]: generateHistorical(BTC_SYMBOL, MOCK_BTC_BASE_PRICE),
        [ETH_SYMBOL]: generateHistorical(ETH_SYMBOL, MOCK_ETH_BASE_PRICE),
    },
    orders: [],
    lastPriceUpdate: Date.now(),
  };
  updateMockPrices();
}

// Ensure initial prices are set
updateMockPrices();
