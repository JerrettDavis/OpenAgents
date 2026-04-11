export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Logo mark */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-bold shadow-lg shadow-indigo-900/40">
          OA
        </div>

        <h1 className="text-4xl font-semibold tracking-tight">OpenAgents</h1>
        <p className="max-w-md text-base text-zinc-400">
          Container-first orchestration platform for agentic CLI tools. Real-time dashboards.
          Durable artifacts. Extensible provider integrations.
        </p>

        <div className="flex gap-3">
          <a
            href="/jobs"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Open Dashboard →
          </a>
          <a
            href="https://github.com/openagents"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Status banner */}
      <p className="absolute bottom-6 text-xs text-zinc-600">
        M1 — dashboard shell, jobs list, job detail, SSE live updates
      </p>
    </main>
  );
}
