interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-900/50 bg-red-950/20 px-8 py-12 text-center">
      <span className="text-2xl" aria-hidden>
        ⚠
      </span>
      <div>
        <p className="text-sm font-medium text-red-300">{title}</p>
        <p className="mt-1 text-xs text-red-400/80">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-300 transition-colors hover:border-red-600 hover:text-red-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}
