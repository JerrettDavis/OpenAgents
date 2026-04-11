export default function HomePage() {
  const providers = ['Claude Code', 'OpenCode', 'Codex', 'Gemini', 'Copilot'];

  return (
    <main
      id="app-main"
      className="relative min-h-screen overflow-hidden px-4 py-6 text-[color:var(--foreground)] lg:px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]" />
      <div className="relative mx-auto flex w-full max-w-[1480px] flex-col gap-4">
        <section className="console-surface-strong console-hairline overflow-hidden rounded-lg p-5 lg:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.8fr)]">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[color:color-mix(in_oklch,var(--line-strong)_44%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_92%,transparent)] text-xs font-black tracking-[0.14em] text-[color:var(--accent)]">
                  OA
                </div>
                <div>
                  <p className="console-kicker">OpenAgents // operator console</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-muted)]">
                    Container-first orchestration for CLI-native agent workflows.
                  </p>
                </div>
              </div>

              <div className="max-w-4xl space-y-3">
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-5xl xl:text-6xl">
                  Compact control for provider-backed agent work.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[color:var(--foreground-soft)]">
                  Launch, monitor, and inspect Claude Code, OpenCode, Codex, Gemini, and Copilot
                  from one compact operational surface tuned for headless runs.
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
                    className="rounded-md border border-[color:var(--line)] bg-black/10 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)]"
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="console-surface rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="console-kicker">Launch posture</p>
                    <p className="mt-1 text-xl font-semibold">Headless-first runtime pack</p>
                  </div>
                  <div className="rounded-md border border-emerald-800/80 bg-emerald-950/60 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                    Stable
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
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

              <div className="console-surface rounded-lg p-4">
                <p className="console-kicker">Operator loop</p>
                <div className="mt-4 space-y-2.5">
                  {[
                    'Queue work with explicit workflow and provider selection.',
                    'Watch stages, tasks, events, and logs without leaving the run.',
                    'Verify provider readiness, workflow compatibility, and artifact output.',
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-md border border-[color:var(--line)] bg-black/10 px-3.5 py-3"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[color:color-mix(in_oklch,var(--line-strong)_42%,transparent)] text-[0.72rem] font-semibold text-[color:var(--accent)]">
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
    <div className="rounded-md border border-[color:var(--line)] bg-black/10 px-3.5 py-3">
      <p className="console-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
      <p className="mt-1 text-sm leading-5 text-[color:var(--foreground-muted)]">{note}</p>
    </div>
  );
}
