'use server';
import { analyzePastWeekPriceMovement, type AnalyzePastWeekPriceMovementInput } from '@/ai/flows/analyze-past-week-price-movement';
import { Holding, RobinhoodCrypto } from './robinhoodTrade';
import type { CryptoSymbol, TradeLog, DipSignal} from './types';
import { MAX_INVESTMENT_USD, PROFIT_TARGET_PERCENTAGE, DIP_SCORE_THRESHOLD, BTC_SYMBOL, ETH_SYMBOL, CRYPTO_ASSETS } from './constants';

interface TradingActionResult {
  logs: TradeLog[];
  newPortfolio: Holding;
  dipSignals: DipSignal[];
}

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

    if (holding && holding.quantity_available_for_trading > 0 && currentPrice && currentPrice > 0 ) {  //todo: Replace 0 with actual buy price *1.03
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
            message: `Profit target reached! Sold ${sellQuantity.toFixed(6)} ${asset.id} at $${currentPriceData.price.toFixed(2)}. Target: $${holding.targetSellPrice.toFixed(2)}`,
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
  const currentBtcPrice = marketData.find(m => m.symbol === BTC_SYMBOL)?.price || 0;
  const currentEthPrice = marketData.find(m => m.symbol === ETH_SYMBOL)?.price || 0;

  const aiInput: AnalyzePastWeekPriceMovementInput = {
    // btcPrices: btcHistorical.slice(-7 * 24).map(p => p.price), // Assuming hourly, take last 7 days
    // ethPrices: ethHistorical.slice(-7 * 24).map(p => p.price),
    currentBtcPrice: currentBtcPrice,
    currentEthPrice: currentEthPrice,
  };

  try {
    const aiResult = await analyzePastWeekPriceMovement(aiInput);
    logs.push({ timestamp: Date.now(), message: `AI Analysis: BTC Dip ${aiResult.btcDipScore}, ETH Dip ${aiResult.ethDipScore}. Reco: ${aiResult.recommendation}`, type: 'ai' });

    if (aiResult.btcDipScore >= DIP_SCORE_THRESHOLD) {
        dipSignals.push({ assetId: BTC_SYMBOL, priceAtDip: marketData.BTC.price, score: aiResult.btcDipScore, timestamp: marketData.BTC.timestamp});
    }
    if (aiResult.ethDipScore >= DIP_SCORE_THRESHOLD) {
        dipSignals.push({ assetId: ETH_SYMBOL, priceAtDip: marketData.ETH.price, score: aiResult.ethDipScore, timestamp: marketData.ETH.timestamp});
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
    let cashToInvestThisCycle = Math.min(portfolio.cashUSD, remainingInvestmentCapacity);

    if (cashToInvestThisCycle > 10) { // Minimum $10 to invest
      for (const reco of buyRecommendations) {
        const dipScore = reco.assetId === BTC_SYMBOL ? aiResult.btcDipScore : aiResult.ethDipScore;
        if (dipScore < DIP_SCORE_THRESHOLD) continue;

        const currentPrice = marketData[reco.assetId]?.price;
        if (!currentPrice) continue;

        const investmentAmountForAsset = cashToInvestThisCycle * reco.percentage;
        if (investmentAmountForAsset < 1) continue; // Minimum $1 trade practically

        const quantityToBuy = investmentAmountForAsset / currentPrice;

        try {
          await placeOrder(reco.assetId, 'buy', quantityToBuy);
          const targetSellPrice = parseFloat((currentPrice * (1 + PROFIT_TARGET_PERCENTAGE)).toFixed(2));
          
          // The mock `placeOrder` updates the portfolio. We need to update `targetSellPrice` on the new/updated holding.
          // This is tricky with mock. A real API would return order details, then you'd update your local state.
          // For mock, let's assume `placeOrder` correctly updates amounts and avgBuyPrice.
          // We'll refetch portfolio and manually update the targetSellPrice for the *newest* part of the holding.
          // Simplification: if a holding for this asset already exists, this logic might need refinement for multiple buy lots.
          // For now, we'll update the targetSellPrice on the *entire* holding, using its new avgBuyPrice.
          
          portfolio = await getPortfolio(); // Refetch to get updated avgBuyPrice
          const updatedHolding = portfolio.holdings.find(h => h.assetId === reco.assetId);
          if (updatedHolding) {
            updatedHolding.targetSellPrice = parseFloat((updatedHolding.avgBuyPrice * (1 + PROFIT_TARGET_PERCENTAGE)).toFixed(2));
            // This part is a hack due to mock limitations. A real system would track lots or update more granularly.
            // For the mock, we are essentially setting a new target for the entire updated holding.
            // A better mock would allow placeOrder to return the modified holding or accept a callback.
          }


          logs.push({
            timestamp: Date.now(),
            message: `AI recommended BUY. Bought ${quantityToBuy.toFixed(6)} ${reco.assetId} at $${currentPrice.toFixed(2)}. Target sell: $${targetSellPrice.toFixed(2)}`,
            type: 'buy',
          });
          currentCryptoValueUSD += investmentAmountForAsset; // Update running total
          cashToInvestThisCycle -= investmentAmountForAsset; // Update cash for this cycle
        } catch (error) {
          logs.push({
            timestamp: Date.now(),
            message: `Error buying ${reco.assetId}: ${(error as Error).message}`,
            type: 'error',
          });
        }
      }
    } else if (buyRecommendations.length > 0) {
        logs.push({ timestamp: Date.now(), message: `AI recommended buy, but insufficient funds or capacity ($${cashToInvestThisCycle.toFixed(2)} available).`, type: 'info' });
    }

  } catch (error) {
    logs.push({ timestamp: Date.now(), message: `Error in AI analysis: ${(error as Error).message}`, type: 'error' });
  }
  
  portfolio = await rhCrypto.getHoldings(); // Final fetch
  logs.push({ timestamp: Date.now(), message: 'Algorithm run finished.', type: 'info' });
  return { logs, newPortfolio: portfolio, dipSignals };
}
