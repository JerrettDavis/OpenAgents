interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '⬡', title, description, action }: EmptyStateProps) {
  return (
    <div className="console-surface console-hairline flex flex-col items-center justify-center gap-3 rounded-xl px-8 py-14 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-lg border border-[color:color-mix(in_oklch,var(--line-strong)_40%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_82%,transparent)] text-2xl text-[color:var(--foreground-muted)]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-[color:var(--foreground)]">{title}</p>
        {description && (
          <p className="max-w-md text-sm text-[color:var(--foreground-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
