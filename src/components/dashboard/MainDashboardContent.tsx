
"use client";
import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PortfolioDisplay from './PortfolioDisplay';
import PriceChart from './PriceChart';
import TradingLog from './TradingLog';
import AlgorithmControl from './AlgorithmControl';
import BtcIcon from '@/components/icons/BtcIcon';

const MainDashboardContent: React.FC = () => {
  const {
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
  } = useAppContext();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <header className="flex items-center justify-between space-y-2 pb-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
             <BtcIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">
            CryptoPilot Dashboard
          </h1>
        </div>
        {/* Maybe add a theme toggle or user profile icon here later */}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <PortfolioDisplay portfolio={portfolio} marketData={marketData} isLoading={isLoading && !portfolio} />
          <PriceChart chartData={chartData} dipSignals={dipSignals} isLoading={isLoading && chartData.length === 0} />
        </div>
        <div className="lg:col-span-1 space-y-8">
          <AlgorithmControl
            isRunning={isRunning}
            isLoading={isLoading}
            lastRunTime={lastRunTime}
            nextRunTime={nextRunTime}
            toggleAlgorithm={toggleAlgorithm}
            triggerManualRun={triggerManualRun}
            resetSimulation={resetSimulation}
          />
          <TradingLog logs={tradeLogs} />
        </div>
      </div>
       <footer className="text-center py-8 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CryptoPilot. All transactions are simulated.</p>
        <p>This is a demo application and should not be used for real trading decisions.</p>
      </footer>
    </div>
  );
};

export default MainDashboardContent;
