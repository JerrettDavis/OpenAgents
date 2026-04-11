export default function HomePage() {
  const providers = ['Claude Code', 'OpenCode', 'Codex', 'Gemini', 'Copilot'];

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 text-[color:var(--foreground)] lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(205,168,82,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(107,156,102,0.12),transparent_24%)]" />
      <div className="relative mx-auto flex w-full max-w-[1480px] flex-col gap-6">
        <section className="console-surface-strong console-hairline overflow-hidden rounded-xl p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[color:color-mix(in_oklch,var(--line-strong)_44%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_92%,transparent)] text-sm font-black tracking-[0.16em] text-[color:var(--accent)]">
                  OA
                </div>
                <div>
                  <p className="console-kicker">OpenAgents // operator console</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-muted)]">
                    Container-first orchestration for agentic CLI toolchains.
                  </p>
                </div>
              </div>

              <div className="max-w-4xl space-y-4">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-[color:var(--foreground)] sm:text-6xl xl:text-7xl">
                  Run provider-backed agent work like a control room, not a spreadsheet.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[color:var(--foreground-soft)]">
                  Launch, orchestrate, and monitor Claude Code, OpenCode, Codex, Gemini, and Copilot
                  from one dense operational surface built for headless execution.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/jobs"
                  className="rounded-md border border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:color-mix(in_oklch,var(--accent)_24%,transparent)]"
                >
                  Open dashboard
                </a>
                <a
                  href="/workflows"
                  className="rounded-md border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
                >
                  Inspect workflows
                </a>
                <a
                  href="https://github.com/JerrettDavis/OpenAgents"
                  className="rounded-md border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
                >
                  GitHub repo
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <span
                    key={provider}
                    className="rounded-md border border-[color:var(--line)] bg-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)]"
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="console-surface rounded-xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="console-kicker">Launch posture</p>
                    <p className="mt-1 text-xl font-semibold">Headless-first runtime pack</p>
                  </div>
                  <div className="rounded-md border border-emerald-800/80 bg-emerald-950/60 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                    Stable
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricTile label="Providers" value="5" note="Launchable and orchestrated" />
                  <MetricTile label="Modes" value="Headless" note="Interactive remains secondary" />
                  <MetricTile
                    label="Surfaces"
                    value="Jobs"
                    note="Detail, timeline, logs, artifacts"
                  />
                  <MetricTile label="Docs" value="DocFX" note="API + guides + plans" />
                </div>
              </div>

              <div className="console-surface rounded-xl p-5">
                <p className="console-kicker">Operator loop</p>
                <div className="mt-4 space-y-3">
                  {[
                    'Queue work with explicit workflow and provider selection.',
                    'Watch stages, tasks, events, and logs without leaving the run.',
                    'Verify provider readiness, workflow compatibility, and artifact output.',
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-black/10 px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_oklch,var(--line-strong)_42%,transparent)] text-[0.72rem] font-semibold text-[color:var(--accent)]">
                        0{index + 1}
                      </span>
                      <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-black/10 px-4 py-3">
      <p className="console-label">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-sm leading-5 text-[color:var(--foreground-muted)]">{note}</p>
    </div>
  );
}
