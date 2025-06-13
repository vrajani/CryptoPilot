import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BtcIcon from '@/components/icons/BtcIcon';
import EthIcon from '@/components/icons/EthIcon';
import { DollarSign, Briefcase } from 'lucide-react';
import type { Portfolio, MarketData, CryptoSymbol } from '@/lib/types';
import { BTC_SYMBOL, ETH_SYMBOL } from '@/lib/constants';

interface PortfolioDisplayProps {
  portfolio: Portfolio | null;
  marketData: MarketData | null;
  isLoading: boolean;
}

const PortfolioDisplay: React.FC<PortfolioDisplayProps> = ({ portfolio, marketData, isLoading }) => {
  
  const getAssetDisplayData = (assetId: CryptoSymbol) => {
    const holding = portfolio?.holdings.find(h => h.assetId === assetId);
    const currentPrice = marketData?.[assetId]?.price;
    const value = holding && currentPrice ? holding.amount * currentPrice : 0;
    return {
      amount: holding?.amount || 0,
      value: value,
      avgBuyPrice: holding?.avgBuyPrice,
      icon: assetId === BTC_SYMBOL ? <BtcIcon className="w-6 h-6 text-primary" /> : <EthIcon className="w-6 h-6 text-primary" />,
      name: assetId === BTC_SYMBOL ? 'Bitcoin' : 'Ethereum',
    };
  };

  const btcData = getAssetDisplayData(BTC_SYMBOL);
  const ethData = getAssetDisplayData(ETH_SYMBOL);

  const totalCryptoValue = btcData.value + ethData.value;
  const totalPortfolioValue = (portfolio?.cashUSD || 0) + totalCryptoValue;

  if (isLoading && !portfolio) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <AssetCard
        title="Bitcoin (BTC)"
        icon={<BtcIcon className="w-5 h-5 text-muted-foreground" />}
        amount={btcData.amount}
        value={btcData.value}
        avgBuyPrice={btcData.avgBuyPrice}
        currentPrice={marketData?.BTC?.price}
      />
      <AssetCard
        title="Ethereum (ETH)"
        icon={<EthIcon className="w-5 h-5 text-muted-foreground" />}
        amount={ethData.amount}
        value={ethData.value}
        avgBuyPrice={ethData.avgBuyPrice}
        currentPrice={marketData?.ETH?.price}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
          <DollarSign className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${portfolio?.cashUSD.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">Ready to invest</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
          <Briefcase className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalPortfolioValue.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">Crypto + Cash</p>
        </CardContent>
      </Card>
    </div>
  );
};


interface AssetCardProps {
    title: string;
    icon: React.ReactNode;
    amount: number;
    value: number;
    avgBuyPrice?: number;
    currentPrice?: number;
}

const AssetCard: React.FC<AssetCardProps> = ({ title, icon, amount, value, avgBuyPrice, currentPrice }) => {
    let pnlPercentage: number | null = null;
    if (avgBuyPrice && currentPrice && amount > 0) {
        pnlPercentage = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${value.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                    {amount.toFixed(6)} units @ avg ${avgBuyPrice?.toFixed(2) || 'N/A'}
                </p>
                {pnlPercentage !== null && (
                     <p className={`text-xs font-medium ${pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}% P/L
                    </p>
                )}
            </CardContent>
        </Card>
    )
}


export default PortfolioDisplay;
