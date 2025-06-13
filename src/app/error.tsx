
"use client"; 

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="text-center space-y-6 bg-card p-10 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-destructive font-headline">
          Oops! Something went wrong.
        </h2>
        <p className="text-muted-foreground">
          We encountered an unexpected issue. Please try again.
        </p>
        {error?.message && (
            <p className="text-sm bg-destructive/10 p-3 rounded-md text-destructive font-code">
                Error details: {error.message}
            </p>
        )}
        <Button
          onClick={() => reset()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Try again"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
