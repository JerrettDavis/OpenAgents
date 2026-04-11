interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '[]', title, description, action }: EmptyStateProps) {
  return (
    <div className="console-surface console-hairline flex flex-col items-center justify-center gap-3 rounded-[8px] px-8 py-12 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-[color:color-mix(in_oklch,var(--line-strong)_40%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_82%,transparent)] text-sm font-mono text-[color:var(--foreground-muted)]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-[color:var(--foreground)]">{title}</p>
        {description && (
          <p className="max-w-md text-sm leading-6 text-[color:var(--foreground-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
