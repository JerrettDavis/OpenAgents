'use client';

import { useState } from 'react';
import { providersApi } from '@/lib/api/client';
import { useProviders } from '@/lib/hooks/use-providers';
import { useSystemInfo } from '@/lib/hooks/use-system-info';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';

export function SettingsView() {
  const providers = useProviders();
  const system = useSystemInfo();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createProvider() {
    setPending(true);
    setActionError(null);
    try {
      const ts = Date.now();
      await providersApi.create({
        provider_id: `provider-${ts}`,
        name: `Provider ${ts}`,
        version: '1.0.0',
        docker_image: 'ghcr.io/example/provider:latest',
        support_level: 'Community',
        is_enabled: true,
      });
      await providers.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create provider');
    } finally {
      setPending(false);
    }
  }

  async function toggleProvider(providerId: string, isEnabled: boolean) {
    setActionError(null);
    try {
      await providersApi.update(providerId, { is_enabled: !isEnabled });
      await providers.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update provider');
    }
  }

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Settings</h1>
          <p className="mt-1 text-xs text-zinc-500">Runtime and provider configuration controls.</p>
        </div>
        <button
          onClick={() => void createProvider()}
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? 'Creating…' : '+ New Provider'}
        </button>
      </div>

      {actionError && <ErrorState message={actionError} />}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs">
        <p className="text-zinc-500">Workspace root</p>
        <p className="mt-1 font-mono text-zinc-300">{system.info?.workspace_root ?? '—'}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-4 py-2 text-left text-zinc-500">Provider</th>
              <th className="px-4 py-2 text-left text-zinc-500">Status</th>
              <th className="px-4 py-2 text-left text-zinc-500">Image</th>
              <th className="px-4 py-2 text-left text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {providerItems.map((p) => (
              <tr key={p.id} className="bg-zinc-900/40">
                <td className="px-4 py-2 text-zinc-200">{p.provider_id}</td>
                <td className="px-4 py-2 text-zinc-400">{p.is_enabled ? 'enabled' : 'disabled'}</td>
                <td className="px-4 py-2 font-mono text-zinc-500">{p.docker_image}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => void toggleProvider(p.provider_id, p.is_enabled)}
                    className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500"
                  >
                    {p.is_enabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
