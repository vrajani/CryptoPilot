import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TradeLog } from '@/lib/types';
import { format } from 'date-fns';
import { Bot, AlertCircle, ShoppingCart, Repeat, Info } from 'lucide-react';

interface TradingLogProps {
  logs: TradeLog[];
}

const TradingLog: React.FC<TradingLogProps> = ({ logs }) => {
  const getIconForType = (type: TradeLog['type']) => {
    switch (type) {
      case 'ai': return <Bot className="h-4 w-4 text-blue-500" />;
      case 'buy': return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case 'sell': return <Repeat className="h-4 w-4 text-red-500" />; // Repeat can signify exchange/sell
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'info':
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Activity Log</CardTitle>
        <CardDescription>Recent actions and events from the trading algorithm.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log, index) => (
                <li key={index} className="flex items-start space-x-3 text-sm">
                  <span className="flex-shrink-0 pt-0.5">{getIconForType(log.type)}</span>
                  <div className="flex-grow">
                    <span className="font-medium text-foreground/90">
                      {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                    </span>
                    <p className="text-muted-foreground leading-tight">{log.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TradingLog;
