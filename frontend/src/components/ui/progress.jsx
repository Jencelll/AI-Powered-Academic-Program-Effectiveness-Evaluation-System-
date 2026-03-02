import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

export const Progress = ({ value = 0, label }) => {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-medium text-foreground">{clamped.toFixed(2)}%</span>
        </div>
      ) : null}
      <ProgressPrimitive.Root className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator
          style={{ transform: `translateX(-${100 - clamped}%)` }}
          className="h-full w-full flex-1 bg-primary transition-transform"
        />
      </ProgressPrimitive.Root>
    </div>
  );
};