import { cn } from '@/lib/utils/cn';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted'
  | 'blue'
  | 'amber'
  | 'red'
  | 'green'
  | 'violet';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
  success: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  warning: 'bg-amber-950 text-amber-400 border border-amber-800',
  error: 'bg-red-950 text-red-400 border border-red-800',
  info: 'bg-blue-950 text-blue-400 border border-blue-800',
  muted: 'bg-zinc-900 text-zinc-500 border border-zinc-800',
  blue: 'bg-blue-950 text-blue-300 border border-blue-800',
  amber: 'bg-amber-950 text-amber-300 border border-amber-800',
  red: 'bg-red-950 text-red-300 border border-red-800',
  green: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
  violet: 'bg-violet-950 text-violet-300 border border-violet-800',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-zinc-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  muted: 'bg-zinc-500',
  blue: 'bg-blue-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
  green: 'bg-emerald-400',
  violet: 'bg-violet-400',
};

export function Badge({ children, variant = 'default', className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium leading-none',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_CLASSES[variant])} />}
      {children}
    </span>
  );
}
