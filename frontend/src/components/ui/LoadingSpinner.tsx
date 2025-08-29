import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={clsx(
      'animate-spin rounded-full border-b-2 border-circle-600',
      sizeClasses[size],
      className
    )} />
  );
}

interface LoadingStateProps {
  children?: React.ReactNode;
  className?: string;
}

export function LoadingState({ children, className }: LoadingStateProps) {
  return (
    <div className={clsx('flex items-center justify-center py-8', className)}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        {children && (
          <p className="text-gray-600">{children}</p>
        )}
      </div>
    </div>
  );
}
