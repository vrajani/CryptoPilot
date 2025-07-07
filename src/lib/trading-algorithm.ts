'use server';
import { analyzePastWeekPriceMovement, type AnalyzePastWeekPriceMovementInput } from '@/ai/flows/analyze-past-week-price-movement';
import * as fs from 'fs/promises';
import { Holding, RobinhoodCrypto } from './robinhoodTrade';
import type { CryptoSymbol, TradeLog, DipSignal} from './types';
import { MAX_INVESTMENT_USD, PROFIT_TARGET_PERCENTAGE, DIP_SCORE_THRESHOLD, BTC_SYMBOL, ETH_SYMBOL, CRYPTO_ASSETS } from './constants';

interface TradingActionResult {
  logs: TradeLog[];
  newPortfolio: Holding;
  dipSignals: DipSignal[];
}

const TRADING_LOG_FILE = 'src/trading_log.csv';

const rhCrypto = new RobinhoodCrypto({
  privateKeyBase64: process.env.PRIVATE_KEY_BASE64 || '',
  publicKeyBase64: process.env.PUBLIC_KEY_BASE64 || '',
  apiKey: process.env.API_KEY || '',
});

export async function runTradingLogic(): Promise<TradingActionResult> {
  const logs: TradeLog[] = [];
  const dipSignals: DipSignal[] = [];
  let portfolio = await rhCrypto.getHoldings();
  const marketData = (await rhCrypto.getBestBidAsk(CRYPTO_ASSETS.map(e => e.usdSymbol))).results;

  logs.push({ timestamp: Date.now(), message: 'Algorithm run started.', type: 'info' });

  // Calculate current total crypto value
  let currentCryptoValueUSD = 0;
  for (const holding of portfolio.results) {
    const currentPrice = marketData.find(m => m.symbol === CRYPTO_ASSETS.find(c => c.id === holding.asset_code)?.usdSymbol)?.price;
    if (currentPrice) {
      currentCryptoValueUSD += holding.total_quantity * currentPrice;
    }
  }

  // 1. Sell Logic (Check for 3% profit target)
  for (const asset of CRYPTO_ASSETS) {
    const holding = portfolio.results.find(h => h.asset_code === asset.id);
    const currentPrice = marketData.find(m => m.symbol === asset.usdSymbol)?.price;
    let targetSellPrice = 0;

    // Read the trading log to find the last buy price for this asset
    try {
      const logContent = await fs.readFile(TRADING_LOG_FILE, 'utf-8');
      const lines = logContent.trim().split('\n');
      const lastBuyEntry = lines.find(line => {
        const [action, , , , symbol] = line.split(',');
        return action === 'buy' && symbol === asset.id;
      });
      if (lastBuyEntry) {
        const [, buyPrice] = lastBuyEntry.split(',');
        targetSellPrice = parseFloat(buyPrice) * (1 + PROFIT_TARGET_PERCENTAGE);
      }
    } catch (error) {
      logs.push({ timestamp: Date.now(), message: `Error reading trading log for sell logic: ${(error as Error).message}`, type: 'error' });
    }
    if (holding && holding.quantity_available_for_trading > 0 && currentPrice && currentPrice > targetSellPrice ) { 
      try {
          const sellQuantity = holding.quantity_available_for_trading; // Sell all of this specific bought batch
          await rhCrypto.placeOrder({
            symbol: asset.id,
            side: 'sell',
            type: 'market',
            market_order_config: {
              asset_quantity: sellQuantity,
            },
          });
          logs.push({
            timestamp: Date.now(),
            message: `Profit target reached! Sold ${sellQuantity.toFixed(6)} ${asset.id} at $${currentPrice.toFixed(2)}.`,
            type: 'sell',
          });
          // Portfolio is updated implicitly by placeOrder in mock, refetch for accuracy
          portfolio = await rhCrypto.getHoldings(); 
          currentCryptoValueUSD = portfolio.results.reduce((sum, h) => {
            const price = currentPrice || 0;
            return sum + (h.quantity_available_for_trading * price);
          }, 0);
        } catch (error) {
          logs.push({
            timestamp: Date.now(),
            message: `Error selling ${asset.id}: ${(error as Error).message}`,
            type: 'error',
          });
        }
    }
  }

  // 2. Buy Logic (Using GenAI for dip detection)
  const currentBtcMarketData = marketData.find(m => m.symbol === BTC_SYMBOL);
  const currentEthMarketData = marketData.find(m => m.symbol === ETH_SYMBOL);

  const aiInput: AnalyzePastWeekPriceMovementInput = {
    // btcPrices: btcHistorical.slice(-7 * 24).map(p => p.price), // Assuming hourly, take last 7 days
    // ethPrices: ethHistorical.slice(-7 * 24).map(p => p.price),
    currentBtcPrice: currentBtcMarketData?.price || 0,
    currentEthPrice: currentEthMarketData?.price || 0,
  };

  try {
    const aiResult = await analyzePastWeekPriceMovement(aiInput);
    logs.push({ timestamp: Date.now(), message: `AI Analysis: BTC Dip ${aiResult.btcDipScore}, ETH Dip ${aiResult.ethDipScore}. Reco: ${aiResult.recommendation}`, type: 'ai' });

    if (aiResult.btcDipScore >= DIP_SCORE_THRESHOLD) {
        dipSignals.push({ assetId: BTC_SYMBOL, priceAtDip: currentBtcMarketData?.price || 0, score: aiResult.btcDipScore, timestamp: Number(currentBtcMarketData?.timestamp) || 0});
    }
    if (aiResult.ethDipScore >= DIP_SCORE_THRESHOLD) {
        dipSignals.push({ assetId: ETH_SYMBOL, priceAtDip: currentEthMarketData?.price || 0, score: aiResult.ethDipScore, timestamp: Number(currentEthMarketData?.timestamp) || 0});
    }

    // Parse recommendation (example: "Buy BTC 60%, ETH 40%" or "Hold" or "Buy BTC 100%")
    // This is a simplified parsing logic. A more robust solution might be needed.
    const buyRecommendations: { assetId: CryptoSymbol; percentage: number }[] = [];
    if (aiResult.recommendation.toLowerCase().includes('buy')) {
      const parts = aiResult.recommendation.split(',').map(p => p.trim());
      for (const part of parts) {
        if (part.toLowerCase().includes(BTC_SYMBOL.toLowerCase())) {
          const match = part.match(/(\d+)%/);
          if (match) buyRecommendations.push({ assetId: BTC_SYMBOL, percentage: parseInt(match[1]) / 100 });
        } else if (part.toLowerCase().includes(ETH_SYMBOL.toLowerCase())) {
          const match = part.match(/(\d+)%/);
          if (match) buyRecommendations.push({ assetId: ETH_SYMBOL, percentage: parseInt(match[1]) / 100 });
        }
      }
       // If no percentages, but "buy BTC" or "buy ETH", assume 100% for that asset if it's the only one.
       if (buyRecommendations.length === 0) {
         if (aiResult.recommendation.toLowerCase().includes(BTC_SYMBOL.toLowerCase())) buyRecommendations.push({ assetId: BTC_SYMBOL, percentage: 1.0 });
         if (aiResult.recommendation.toLowerCase().includes(ETH_SYMBOL.toLowerCase())) buyRecommendations.push({ assetId: ETH_SYMBOL, percentage: 1.0 });
       }
    }


    let remainingInvestmentCapacity = MAX_INVESTMENT_USD - currentCryptoValueUSD;

    if (remainingInvestmentCapacity > 10) { // Minimum $10 to invest
      for (const reco of buyRecommendations) {
        const dipScore = reco.assetId === BTC_SYMBOL ? aiResult.btcDipScore : aiResult.ethDipScore;
        if (dipScore < DIP_SCORE_THRESHOLD) continue;

        const currentPrice = reco.assetId === BTC_SYMBOL ? currentBtcMarketData?.price: currentEthMarketData?.price;
        if (!currentPrice) continue;

        const investmentAmountForAsset = remainingInvestmentCapacity * reco.percentage;
        if (investmentAmountForAsset < 1) continue; // Minimum $1 trade practically

        const quantityToBuy = investmentAmountForAsset / currentPrice;

        try {
          await rhCrypto.placeOrder({
            symbol: reco.assetId,
            side: 'buy',
            type: 'market',
            market_order_config: {
              asset_quantity: quantityToBuy,
            },
          });
          const targetSellPrice = parseFloat((currentPrice * (1 + PROFIT_TARGET_PERCENTAGE)).toFixed(2));
          
          // Append to trading log
          const logEntry = `buy,${currentPrice.toFixed(2)},n/a,${reco.assetId},${reco.assetId},${Date.now()}\n`; // order ID is mock, asset ID is duplicated for now
          try {
            // Read existing content
            let existingContent = '';
            try {
              existingContent = await fs.readFile(TRADING_LOG_FILE, 'utf-8');
            } catch (readError) {
              // File doesn't exist, that's okay
            }
            // Write new entry at the beginning
            await fs.writeFile(TRADING_LOG_FILE, logEntry + existingContent, 'utf-8');
          } catch (writeError) {
            logs.push({ timestamp: Date.now(), message: `Error writing to trading log: ${(writeError as Error).message}`, type: 'error' });
          }
          // The mock `placeOrder` updates the portfolio. We need to update `targetSellPrice` on the new/updated holding.
          // This is tricky with mock. A real API would return order details, then you'd update your local state.
          // For mock, let's assume `placeOrder` correctly updates amounts and avgBuyPrice.
          // We'll refetch portfolio and manually update the targetSellPrice for the *newest* part of the holding.
          // Simplification: if a holding for this asset already exists, this logic might need refinement for multiple buy lots.
          // For now, we'll update the targetSellPrice on the *entire* holding, using its new avgBuyPrice.
          
          portfolio = await rhCrypto.getHoldings(); // Refetch to get updated avgBuyPrice
          const updatedHolding = portfolio.results.find(h => h.asset_code === reco.assetId);


          logs.push({
            timestamp: Date.now(),
            message: `AI recommended BUY. Bought ${quantityToBuy.toFixed(6)} ${reco.assetId} at $${currentPrice.toFixed(2)}. Target sell: $${targetSellPrice.toFixed(2)}`,
            type: 'buy',
          });
          currentCryptoValueUSD += investmentAmountForAsset; // Update running total
        } catch (error) {
          logs.push({
            timestamp: Date.now(),
            message: `Error buying ${reco.assetId}: ${(error as Error).message}`,
            type: 'error',
          });
        }
      }
    } else if (buyRecommendations.length > 0) {
        logs.push({ timestamp: Date.now(), message: `AI recommended buy, but insufficient funds or capacity.`, type: 'info' });
    }

  } catch (error) {
    logs.push({ timestamp: Date.now(), message: `Error in AI analysis: ${(error as Error).message}`, type: 'error' });
  }
  
  portfolio = await rhCrypto.getHoldings(); // Final fetch
  logs.push({ timestamp: Date.now(), message: 'Algorithm run finished.', type: 'info' });
  return { logs, newPortfolio: portfolio.next ? portfolio.results[0] : portfolio.results[portfolio.results.length - 1], dipSignals };
}
