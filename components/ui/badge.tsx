import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary border-primary/20',
        variant === 'outline' && 'border-border bg-transparent',
        className,
      )}
      {...props}
    />
  );
}
