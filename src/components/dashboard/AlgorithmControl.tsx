import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlayCircle, RotateCcw, Power, Timer, CheckCircle } from 'lucide-react';
import { formatDistanceToNowStrict, format } from 'date-fns';

interface AlgorithmControlProps {
  isRunning: boolean;
  isLoading: boolean;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  toggleAlgorithm: () => void;
  triggerManualRun: () => void;
  resetSimulation: () => void;
}

const AlgorithmControl: React.FC<AlgorithmControlProps> = ({
  isRunning,
  isLoading,
  lastRunTime,
  nextRunTime,
  toggleAlgorithm,
  triggerManualRun,
  resetSimulation
}) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Algorithm Control</CardTitle>
        <CardDescription>Manage and monitor the CryptoPilot trading algorithm.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <Power className={`h-6 w-6 ${isRunning ? 'text-green-500' : 'text-red-500'}`} />
            <Label htmlFor="algorithm-toggle" className="text-lg font-medium">
              Algorithm Status: {isRunning ? 'Running' : 'Stopped'}
            </Label>
          </div>
          <Switch
            id="algorithm-toggle"
            checked={isRunning}
            onCheckedChange={toggleAlgorithm}
            disabled={isLoading && isRunning} 
            aria-label={isRunning ? "Stop trading algorithm" : "Start trading algorithm"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <Timer className="h-4 w-4 mr-2"/>
                    Next Scheduled Run
                </div>
                <p className="text-lg font-semibold">
                    {isRunning && nextRunTime ? `${formatDistanceToNowStrict(nextRunTime, { addSuffix: true })}` : 'N/A'}
                </p>
                {isRunning && nextRunTime && <p className="text-xs text-muted-foreground">{format(nextRunTime, "MMM d, HH:mm:ss")}</p>}
            </div>
            <div className="p-4 border rounded-lg">
                 <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <CheckCircle className="h-4 w-4 mr-2"/>
                    Last Successful Run
                </div>
                <p className="text-lg font-semibold">
                    {lastRunTime ? `${formatDistanceToNowStrict(lastRunTime, { addSuffix: true })}` : 'N/A'}
                </p>
                {lastRunTime && <p className="text-xs text-muted-foreground">{format(lastRunTime, "MMM d, HH:mm:ss")}</p>}
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={triggerManualRun} 
            disabled={isLoading} 
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            aria-label="Run trading algorithm manually"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Run Manually Now
          </Button>
          <Button 
            onClick={resetSimulation} 
            disabled={isLoading} 
            variant="outline"
            className="flex-1"
            aria-label="Reset simulation data"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Reset Simulation
          </Button>
        </div>
        {isLoading && <p className="text-sm text-center text-primary animate-pulse">Processing...</p>}
      </CardContent>
    </Card>
  );
};

export default AlgorithmControl;
