import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartDataItem, DipSignal } from '@/lib/types';
import { BTC_SYMBOL, ETH_SYMBOL } from '@/lib/constants';
import BtcIcon from '@/components/icons/BtcIcon';
import EthIcon from '@/components/icons/EthIcon';

interface PriceChartProps {
  chartData: ChartDataItem[];
  dipSignals: DipSignal[];
  isLoading: boolean;
}

const PriceChart: React.FC<PriceChartProps> = ({ chartData, dipSignals, isLoading }) => {
  const chartConfig = {
    [BTC_SYMBOL]: {
      label: "BTC Price",
      color: "hsl(var(--chart-1))",
      icon: BtcIcon,
    },
    [ETH_SYMBOL]: {
      label: "ETH Price",
      color: "hsl(var(--chart-2))",
      icon: EthIcon,
    },
  };
  
  if (isLoading && chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History (Past 48 Hours)</CardTitle>
          <CardDescription>BTC and ETH price movements.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Price History (Past 48 Hours)</CardTitle>
                <CardDescription>BTC and ETH price movements.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">No chart data available.</p>
            </CardContent>
        </Card>
    )
  }
  
  // Augment chart data with dip signal points for ReferenceDot
  const renderDipSignals = (assetId: 'BTC' | 'ETH') => {
    return dipSignals
      .filter(signal => signal.assetId === assetId)
      .map((signal, index) => {
        // Find the closest chart data point by timestamp to place the dot
        // This is an approximation. A more accurate way would be to ensure dip signal timestamps align with chart data.
        const closestChartPoint = chartData.reduce((prev, curr) => {
            const prevTime = new Date(prev.date).getTime();
            const currTime = new Date(curr.date).getTime();
            return (Math.abs(currTime - signal.timestamp) < Math.abs(prevTime - signal.timestamp) ? curr : prev);
        });
        
        return (
          <ReferenceDot
            key={`${assetId}-dip-${index}`}
            x={closestChartPoint.date}
            y={signal.priceAtDip}
            r={5}
            fill={assetId === BTC_SYMBOL ? chartConfig[BTC_SYMBOL].color : chartConfig[ETH_SYMBOL].color}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            ifOverflow="extendDomain"
            aria-label={`${assetId} Dip Signal`}
          />
        );
      });
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Price History (Past 48 Hours)</CardTitle>
        <CardDescription>Visualizing BTC and ETH price movements and potential dip signals.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-video h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke={chartConfig[BTC_SYMBOL].color} 
                tick={{ fill: chartConfig[BTC_SYMBOL].color, fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tickLine={{ stroke: chartConfig[BTC_SYMBOL].color }}
                axisLine={{ stroke: chartConfig[BTC_SYMBOL].color }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke={chartConfig[ETH_SYMBOL].color} 
                tick={{ fill: chartConfig[ETH_SYMBOL].color, fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tickLine={{ stroke: chartConfig[ETH_SYMBOL].color }}
                axisLine={{ stroke: chartConfig[ETH_SYMBOL].color }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" labelKey="Price" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="BTC"
                stroke={chartConfig[BTC_SYMBOL].color}
                strokeWidth={2}
                dot={false}
                name="BTC Price"
                activeDot={{ r: 6, fill: chartConfig[BTC_SYMBOL].color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ETH"
                stroke={chartConfig[ETH_SYMBOL].color}
                strokeWidth={2}
                dot={false}
                name="ETH Price"
                activeDot={{ r: 6, fill: chartConfig[ETH_SYMBOL].color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
              {/* Render dip signals */}
              {/* {renderDipSignals(BTC_SYMBOL)}
              {renderDipSignals(ETH_SYMBOL)} */}
              {/* The ReferenceDot needs a more reliable way to map to x-axis category.
                  For now, highlighting dips could be done by changing line color or background if data supports it.
                  Alternative: Add specific data points for dips in chartData with a special style.
              */}
               {chartData.map((item, index) => {
                if (item.btcDip) {
                  return <ReferenceDot key={`btc-dip-dot-${index}`} r={5} fill={chartConfig.BTC.color} stroke="hsl(var(--background))" strokeWidth={1} x={item.date} y={item.BTC} ifOverflow="extendDomain" aria-label="BTC Dip Signal"/>;
                }
                if (item.ethDip) {
                  return <ReferenceDot key={`eth-dip-dot-${index}`} r={5} fill={chartConfig.ETH.color} stroke="hsl(var(--background))" strokeWidth={1} x={item.date} y={item.ETH} ifOverflow="extendDomain" aria-label="ETH Dip Signal"/>;
                }
                return null;
              })}


            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
