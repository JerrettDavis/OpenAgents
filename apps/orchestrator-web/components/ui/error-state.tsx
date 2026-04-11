interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="console-hairline flex flex-col items-center justify-center gap-4 rounded-[3px] border border-red-950/70 bg-red-950/20 px-8 py-12 text-center shadow-[0_18px_34px_rgba(20,0,0,0.22)]">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-red-900/70 bg-red-950/60 text-sm font-mono text-red-200"
        aria-hidden
      >
        ERR
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-red-100">{title}</p>
        <p className="max-w-lg text-sm text-red-200/78">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-[2px] border border-red-800/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-100 transition hover:border-red-600 hover:bg-red-950/60"
        >
          Retry
        </button>
      )}
    </div>
  );
}
