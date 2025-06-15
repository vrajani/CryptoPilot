
"use client";
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Portfolio, TradeLog, ChartDataItem, MarketData, DipSignal, HistoricalDataPoint } from '@/lib/types';
import { runTradingLogic } from '@/lib/trading-algorithm';
import { ALGORITHM_INTERVAL_MS, BTC_SYMBOL, ETH_SYMBOL } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Holding, RobinhoodCrypto } from '@/lib/robinhoodTrade';
const rhCrypto = new RobinhoodCrypto({
  privateKeyBase64: process.env.PRIVATE_KEY_BASE64 || '',
  publicKeyBase64: process.env.PUBLIC_KEY_BASE64 || '',
  apiKey: process.env.API_KEY || '',
});
interface AppContextType {
  portfolio: Portfolio | null;
  tradeLogs: TradeLog[];
  chartData: ChartDataItem[];
  marketData: MarketData | null;
  dipSignals: DipSignal[];
  isRunning: boolean;
  isLoading: boolean;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  toggleAlgorithm: () => void;
  triggerManualRun: () => Promise<void>;
  resetSimulation: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [dipSignals, setDipSignals] = useState<DipSignal[]>([]);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);

  const { toast } = useToast();

  const updateChartData = useCallback((
    btcHistory: HistoricalDataPoint[],
    ethHistory: HistoricalDataPoint[],
    currentDipSignals: DipSignal[]
  ) => {
    const newChartData: ChartDataItem[] = [];
    const commonTimestamps = new Set([...btcHistory.map(p => p.time), ...ethHistory.map(p => p.time)]);
    const sortedTimestamps = Array.from(commonTimestamps).sort((a, b) => a - b);
    
    // Keep only recent ~24-48 data points for chart performance if too many
    const chartDisplayPoints = sortedTimestamps.slice(-48);


    chartDisplayPoints.forEach(time => {
      const btcPoint = btcHistory.find(p => p.time === time);
      const ethPoint = ethHistory.find(p => p.time === time);
      const btcDip = currentDipSignals.find(ds => ds.assetId === BTC_SYMBOL && Math.abs(ds.timestamp - time) < 3600*1000); // within an hour
      const ethDip = currentDipSignals.find(ds => ds.assetId === ETH_SYMBOL && Math.abs(ds.timestamp - time) < 3600*1000);

      newChartData.push({
        date: format(new Date(time), "MMM d, HH:mm"),
        BTC: btcPoint?.price,
        ETH: ethPoint?.price,
        btcDip: !!btcDip,
        ethDip: !!ethDip,
      });
    });
    setChartData(newChartData);
  }, []);


  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPortfolio, fetchedMarketData] = await Promise.all([
        rhCrypto.getHoldings(),
        rhCrypto.getBestBidAsk()
      ]);
      setPortfolio(fetchedPortfolio);
      setMarketData(fetchedMarketData);
      setTradeLogs([{ timestamp: Date.now(), message: "CryptoPilot initialized.", type: 'info' }]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Failed to fetch initial data.", variant: "destructive" });
      setTradeLogs(prev => [...prev, { timestamp: Date.now(), message: "Error fetching initial data.", type: 'error' }]);
    }
    setIsLoading(false);
  }, [toast, updateChartData]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const executeAlgorithm = useCallback(async () => {

     console.log(process.env.PRIVATE_KEY_BASE64);
     console.log(process.env.PUBLIC_KEY_BASE64);
     console.log(process.env.API_KEY);
     console.log(process.env.GEMINI_API_KEY);
    if (isLoading) return; // Don't run if initial data is still loading
    setIsLoading(true);
    setLastRunTime(new Date());
    try {
      const result = await runTradingLogic();
      setPortfolio(result.newPortfolio);
      setTradeLogs(prev => [...result.logs.reverse(), ...prev].slice(0, 100)); // Keep last 100 logs
      setDipSignals(prev => [...result.dipSignals, ...prev].slice(-10)); // keep recent dips

      const [fetchedMarketData] = await Promise.all([
         fetchMarketDataAPI()
      ]);
      setMarketData(fetchedMarketData);
      
      result.logs.forEach(log => {
        if (log.type === 'buy' || log.type === 'sell') {
          toast({ title: log.type.toUpperCase(), description: log.message });
        }
      });

    } catch (error) {
      console.error("Error running trading algorithm:", error);
      toast({ title: "Algorithm Error", description: (error as Error).message, variant: "destructive" });
      setTradeLogs(prev => [...prev, { timestamp: Date.now(), message: `Algorithm error: ${(error as Error).message}`, type: 'error' }]);
    }
    setIsLoading(false);
  }, [isLoading, toast, updateChartData]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isRunning) {
      setNextRunTime(new Date(Date.now() + ALGORITHM_INTERVAL_MS));
      intervalId = setInterval(() => {
        executeAlgorithm();
        setNextRunTime(new Date(Date.now() + ALGORITHM_INTERVAL_MS));
      }, ALGORITHM_INTERVAL_MS);
    } else {
      setNextRunTime(null);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, executeAlgorithm]);

  const toggleAlgorithm = () => {
    setIsRunning(prev => !prev);
    if (!isRunning) { // if turning on
        executeAlgorithm(); // run immediately
    }
  };

  const triggerManualRun = async () => {
    if (isLoading) {
      toast({ title: "Busy", description: "Algorithm is currently busy.", variant: "default" });
      return;
    }
    toast({ title: "Manual Run", description: "Triggering algorithm manually...", variant: "default" });
    await executeAlgorithm();
  };
  
  const resetSimulation = async () => {
    setIsLoading(true);
    setIsRunning(false);
    await fetchInitialData(); // Refetch initial data after reset
    setTradeLogs([{ timestamp: Date.now(), message: "Simulation reset.", type: 'info' }]);
    setDipSignals([]);
    toast({ title: "Reset", description: "Simulation has been reset.", variant: "default" });
    setIsLoading(false);
  };


  return (
    <AppContext.Provider value={{
      portfolio,
      tradeLogs,
      chartData,
      marketData,
      dipSignals,
      isRunning,
      isLoading,
      lastRunTime,
      nextRunTime,
      toggleAlgorithm,
      triggerManualRun,
      resetSimulation,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
