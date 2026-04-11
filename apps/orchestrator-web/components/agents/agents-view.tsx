'use client';

import { useProviders } from '@/lib/hooks/use-providers';
import { useSystemInfo } from '@/lib/hooks/use-system-info';
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
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-base font-semibold text-zinc-100">Agents</h1>
        <p className="mt-1 text-xs text-zinc-500">Provider-backed agent runtime status.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card label="Active jobs" value={String(system.info?.active_jobs ?? 0)} />
        <Card label="Providers loaded" value={String(providersLoaded)} />
        <Card label="Workflows loaded" value={String(workflowsLoaded)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-4 py-2 text-left text-zinc-500">Provider</th>
              <th className="px-4 py-2 text-left text-zinc-500">Version</th>
              <th className="px-4 py-2 text-left text-zinc-500">Support</th>
              <th className="px-4 py-2 text-left text-zinc-500">Image</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {providerItems.map((p) => (
              <tr key={p.id} className="bg-zinc-900/40">
                <td className="px-4 py-2 text-zinc-200">{p.name}</td>
                <td className="px-4 py-2 text-zinc-400">{p.version}</td>
                <td className="px-4 py-2 text-zinc-400">{p.support_level}</td>
                <td className="px-4 py-2 font-mono text-zinc-500">{p.docker_image}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
