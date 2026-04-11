import { cn } from '@/lib/utils/cn';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-2',
} as const;

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-[color:color-mix(in_oklch,var(--line)_85%,transparent)] border-t-[color:var(--accent)]',
        SIZE_CLASSES[size],
        className
      )}
    />
  );
}

export function SpinnerPage() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
