'use client';

import { useState } from 'react';
import { providersApi } from '@/lib/api/client';
import { useProviders } from '@/lib/hooks/use-providers';
import { requestSystemInfoRefresh, useSystemInfo } from '@/lib/hooks/use-system-info';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';

export function SettingsView() {
  const providers = useProviders();
  const system = useSystemInfo();
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleProvider(providerId: string, isEnabled: boolean) {
    setActionError(null);
    try {
      await providersApi.update(providerId, { is_enabled: !isEnabled });
      await providers.refetch();
      requestSystemInfoRefresh();
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
    <div className="flex flex-1 flex-col gap-3">
      <section className="console-surface-strong console-hairline overflow-hidden rounded-xl px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div>
              <p className="console-kicker">Runtime control</p>
              <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                Adjust provider state, inspect workspace paths, and keep the operator environment
                ready for dispatch.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{providerItems.length} providers configured</Badge>
              <Badge variant="success">
                {providerItems.filter((provider) => provider.is_enabled).length} enabled
              </Badge>
            </div>
          </div>
          <button
            type="button"
            disabled
            title="Provider creation UI is not shipped yet"
            className="rounded-md border border-[color:var(--line)] bg-black/10 px-4 py-2 text-sm font-semibold text-[color:var(--foreground-muted)] opacity-70"
          >
            + New Provider
          </button>
        </div>
      </section>

      {actionError && <ErrorState message={actionError} />}

      <div className="console-surface rounded-md p-4 text-sm">
        <p className="console-kicker">Workspace root</p>
        <p className="mt-2 break-all font-mono text-[color:var(--foreground-soft)]">
          {system.info?.workspace_root ?? '—'}
        </p>
      </div>

      <div className="console-surface overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--line)] bg-black/10 text-left text-[11px] uppercase tracking-[0.08em] text-[color:var(--foreground-muted)]">
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)]">
            {providerItems.map((p) => (
              <tr key={p.id} className="bg-black/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3.5 text-[color:var(--foreground)]">{p.provider_id}</td>
                <td className="px-4 py-3.5">
                  <Badge variant={p.is_enabled ? 'success' : 'muted'}>
                    {p.is_enabled ? 'enabled' : 'disabled'}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-[color:var(--foreground-muted)]">
                  {p.docker_image}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => void toggleProvider(p.provider_id, p.is_enabled)}
                    className="rounded-md border border-[color:var(--line)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
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
