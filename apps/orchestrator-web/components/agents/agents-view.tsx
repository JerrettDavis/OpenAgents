'use client';

import { useProviders } from '@/lib/hooks/use-providers';
import { useSystemInfo } from '@/lib/hooks/use-system-info';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';

export function AgentsView() {
  const providers = useProviders();
  const system = useSystemInfo();

  if (providers.loading || system.loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (providers.error) return <ErrorState message={providers.error} />;
  if (system.error) return <ErrorState message={system.error} />;

  const providerItems = Array.isArray(providers.providers) ? providers.providers : [];
  const providersLoaded = Array.isArray(system.info?.providers_loaded)
    ? system.info!.providers_loaded.length
    : 0;
  const workflowsLoaded = Array.isArray(system.info?.workflows_loaded)
    ? system.info!.workflows_loaded.length
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <section className="console-surface-strong console-hairline overflow-hidden rounded-xl px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="console-kicker">Provider inventory</p>
              <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Agents</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                Inspect the runtime catalog, version footprint, and support posture for every
                provider loaded into the orchestrator.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Headless matrix loaded</Badge>
              <Badge variant="default">{providerItems.length} provider records</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card label="Active jobs" value={String(system.info?.active_jobs ?? 0)} />
            <Card label="Providers loaded" value={String(providersLoaded)} />
            <Card label="Workflows loaded" value={String(workflowsLoaded)} />
          </div>
        </div>
      </section>

      <section className="console-surface overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--line)] text-left text-[color:var(--foreground-muted)]">
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 font-medium">Version</th>
              <th className="px-5 py-3 font-medium">Support</th>
              <th className="px-5 py-3 font-medium">Image</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)]">
            {providerItems.map((p) => (
              <tr key={p.id} className="bg-black/5 hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[color:var(--foreground)]">{p.name}</span>
                    <span className="font-mono text-xs text-[color:var(--foreground-muted)]">
                      {p.provider_id}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-[color:var(--foreground-soft)]">{p.version}</td>
                <td className="px-5 py-4">
                  <Badge variant={p.support_level === 'Supported' ? 'success' : 'warning'}>
                    {p.support_level}
                  </Badge>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-[color:var(--foreground-muted)]">
                  {p.docker_image}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div
      data-testid={`agents-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className="rounded-lg border border-[color:var(--line)] bg-black/10 px-4 py-3"
    >
      <p className="console-label">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-[color:var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
