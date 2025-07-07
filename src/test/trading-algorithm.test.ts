// src/lib/trading-algorithm.test.ts

import { runTradingLogic } from './trading-algorithm';
import { analyzePastWeekPriceMovement } from '@/ai/flows/analyze-past-week-price-movement';
import * as fs from 'fs/promises';
import { RobinhoodCrypto } from './src/lib/robinhoodTrade';
import { MAX_INVESTMENT_USD, PROFIT_TARGET_PERCENTAGE, DIP_SCORE_THRESHOLD, BTC_SYMBOL, ETH_SYMBOL, CRYPTO_ASSETS } from './constants';

// --- Mocks ---

// Mock the AI flow
jest.mock('@/ai/flows/analyze-past-week-price-movement', () => ({
  analyzePastWeekPriceMovement: jest.fn(),
}));

// Mock the file system
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock the RobinhoodCrypto class and its methods
const mockPlaceOrder = jest.fn();
const mockGetHoldings = jest.fn();
const mockGetBestBidAsk = jest.fn();

jest.mock('./lib/robinhoodTrade', () => ({
  RobinhoodCrypto: jest.fn().mockImplementation(() => ({
    placeOrder: mockPlaceOrder,
    getHoldings: mockGetHoldings,
    getBestBidAsk: mockGetBestBidAsk,
  })),
}));

// --- Test Suite ---

// Type-safe mock functions
const mockedAnalyzePastWeekPriceMovement = analyzePastWeekPriceMovement as jest.Mock;
const mockedFsReadFile = fs.readFile as jest.Mock;
const mockedFsWriteFile = fs.writeFile as jest.Mock;

describe('runTradingLogic', () => {
  beforeEach(() => {
    // Reset all mocks before each test to ensure test isolation
    jest.clearAllMocks();
  });

  it('should sell an asset when its profit target is reached', async () => {
    // Arrange
    const lastBuyPrice = 50000;
    const currentPrice = lastBuyPrice * (1 + PROFIT_TARGET_PERCENTAGE + 0.01); // e.g., 51650 for 3% target
    
    mockedFsReadFile.mockResolvedValue(`buy,${lastBuyPrice},n/a,BTC,BTC,${Date.now()}`);
    
    mockGetHoldings.mockResolvedValue({
      results: [{ asset_code: 'BTC', total_quantity: 1, quantity_available_for_trading: 1 }],
    });

    mockGetBestBidAsk.mockResolvedValue({
      results: [{ symbol: 'BTC-USD', price: currentPrice }],
    });

    // AI recommends holding to isolate the sell logic
    mockedAnalyzePastWeekPriceMovement.mockResolvedValue({
      btcDipScore: 3,
      ethDipScore: 3,
      recommendation: 'Hold',
    });

    // Act
    await runTradingLogic();

    // Assert
    expect(mockPlaceOrder).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'BTC',
      side: 'sell',
    }));
    expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
  });

  it('should buy assets when AI recommends it and there is investment capacity', async () => {
    // Arrange
    const btcPrice = 60000;
    const ethPrice = 3000;
    
    // Start with an empty portfolio (full investment capacity)
    mockGetHoldings.mockResolvedValue({ results: [] });
    
    mockGetBestBidAsk.mockResolvedValue({
      results: [
        { symbol: 'BTC-USD', price: btcPrice, timestamp: Date.now().toString() },
        { symbol: 'ETH-USD', price: ethPrice, timestamp: Date.now().toString() },
      ],
    });

    mockedAnalyzePastWeekPriceMovement.mockResolvedValue({
      btcDipScore: 8, // Above threshold
      ethDipScore: 8, // Above threshold
      recommendation: 'Buy BTC 60%, ETH 40%',
    });
    
    // Mock file system for logging the buy
    mockedFsReadFile.mockRejectedValue(new Error('file not found')); // Simulate no existing log file
    mockedFsWriteFile.mockResolvedValue(undefined);

    // Act
    await runTradingLogic();

    // Assert
    expect(mockPlaceOrder).toHaveBeenCalledTimes(2);
    
    // Check BTC buy order
    const investmentForBtc = MAX_INVESTMENT_USD * 0.60;
    const quantityOfBtc = investmentForBtc / btcPrice;
    expect(mockPlaceOrder).toHaveBeenCalledWith({
      symbol: BTC_SYMBOL,
      side: 'buy',
      type: 'market',
      market_order_config: { asset_quantity: quantityOfBtc },
    });

    // Check ETH buy order
    const investmentForEth = MAX_INVESTMENT_USD * 0.40;
    const quantityOfEth = investmentForEth / ethPrice;
    expect(mockPlaceOrder).toHaveBeenCalledWith({
      symbol: ETH_SYMBOL,
      side: 'buy',
      type: 'market',
      market_order_config: { asset_quantity: quantityOfEth },
    });

    // Check that the buy was logged to the file
    expect(mockedFsWriteFile).toHaveBeenCalledTimes(2);
  });

  it('should NOT buy if AI dip score is below the threshold', async () => {
    // Arrange
    mockGetHoldings.mockResolvedValue({ results: [] });
    mockGetBestBidAsk.mockResolvedValue({ results: [{ symbol: 'BTC-USD', price: 60000 }] });
    
    mockedAnalyzePastWeekPriceMovement.mockResolvedValue({
      btcDipScore: 5, // Below threshold of 7
      ethDipScore: 4,
      recommendation: 'Buy BTC 100%',
    });

    // Act
    const result = await runTradingLogic();

    // Assert
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    const infoLogs = result.logs.filter(log => log.type === 'info');
    // It should not log "insufficient funds", just proceed without buying
    expect(infoLogs.some(log => log.message.includes('insufficient funds'))).toBe(false);
  });

  it('should NOT buy if investment capacity is exceeded', async () => {
    // Arrange
    const currentBtcPrice = 60000;
    // Portfolio value is already at the max investment limit
    const holdings = {
      results: [{ asset_code: 'BTC', total_quantity: MAX_INVESTMENT_USD / currentBtcPrice, quantity_available_for_trading: 0 }],
    };
    mockGetHoldings.mockResolvedValue(holdings);
    mockGetBestBidAsk.mockResolvedValue({ results: [{ symbol: 'BTC-USD', price: currentBtcPrice }] });

    mockedAnalyzePastWeekPriceMovement.mockResolvedValue({
      btcDipScore: 9,
      ethDipScore: 3,
      recommendation: 'Buy BTC 100%',
    });

    // Act
    const result = await runTradingLogic();

    // Assert
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(result.logs.some(log => log.message.includes('insufficient funds'))).toBe(true);
  });

  it('should handle errors from the AI analysis gracefully', async () => {
    // Arrange
    const errorMessage = 'AI model is offline';
    mockedAnalyzePastWeekPriceMovement.mockRejectedValue(new Error(errorMessage));
    mockGetHoldings.mockResolvedValue({ results: [] });
    mockGetBestBidAsk.mockResolvedValue({ results: [] });

    // Act
    const result = await runTradingLogic();

    // Assert
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    const errorLog = result.logs.find(log => log.type === 'error');
    expect(errorLog).toBeDefined();
    expect(errorLog?.message).toContain('Error in AI analysis');
    expect(errorLog?.message).toContain(errorMessage);
  });

  /**
   * @notice There appears to be a bug in `runTradingLogic`.
   * The return type `TradingActionResult` defines `newPortfolio` as a `Holding` object,
   * but the implementation returns a single holding item (`portfolio.results[0]`).
   * This test is written to expect the *correct* full portfolio object.
   * If this test fails, check the return statement of `runTradingLogic`.
   * It should likely be `return { ..., newPortfolio: portfolio, ... };`
   */
  it('should return the final, complete portfolio state', async () => {
    // Arrange
    const finalPortfolioState = {
      results: [{ asset_code: 'BTC', total_quantity: 1.5, quantity_available_for_trading: 1.5 }],
      next: undefined,
    };
    
    // Mock getHoldings to be called multiple times, returning the final state on the last call
    mockGetHoldings
      .mockResolvedValueOnce({ results: [] }) // Initial state
      .mockResolvedValueOnce(finalPortfolioState); // Final state

    mockGetBestBidAsk.mockResolvedValue({ results: [] });
    mockedAnalyzePastWeekPriceMovement.mockResolvedValue({ recommendation: 'Hold' });

    // Act
    const result = await runTradingLogic();

    // Assert
    // This line might fail due to the bug mentioned above.
    // To match the buggy code, you would change this to:
    // expect(result.newPortfolio).toEqual(finalPortfolioState.results[0]);
    expect(result.newPortfolio).toEqual(finalPortfolioState);
  });
});