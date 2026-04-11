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
  default:
    'border border-[color:color-mix(in_oklch,var(--line-strong)_34%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_82%,transparent)] text-[color:var(--foreground-soft)]',
  success:
    'border border-emerald-800/90 bg-emerald-950/60 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  warning:
    'border border-amber-800/90 bg-amber-950/60 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  error:
    'border border-red-900/90 bg-red-950/70 text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  info: 'border border-sky-900/90 bg-sky-950/70 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  muted:
    'border border-[color:color-mix(in_oklch,var(--line)_86%,transparent)] bg-[color:color-mix(in_oklch,var(--surface)_78%,transparent)] text-[color:var(--foreground-muted)]',
  blue: 'border border-sky-900/90 bg-sky-950/70 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  amber:
    'border border-amber-800/90 bg-amber-950/60 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  red: 'border border-red-900/90 bg-red-950/70 text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  green:
    'border border-emerald-800/90 bg-emerald-950/60 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  violet:
    'border border-fuchsia-900/90 bg-fuchsia-950/65 text-fuchsia-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
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
        'inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1 text-[11px] font-medium leading-none',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_CLASSES[variant])} />}
      {children}
    </span>
  );
}
