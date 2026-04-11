'use client';

import { useState } from 'react';
import { providersApi } from '@/lib/api/client';
import { useProviders } from '@/lib/hooks/use-providers';
import { requestSystemInfoRefresh, useSystemInfo } from '@/lib/hooks/use-system-info';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';

interface CreateProviderForm {
  providerId: string;
  name: string;
  version: string;
  dockerImage: string;
  description: string;
  supportLevel: string;
  isEnabled: boolean;
}

const EMPTY_PROVIDER_FORM: CreateProviderForm = {
  providerId: '',
  name: '',
  version: '',
  dockerImage: '',
  description: '',
  supportLevel: 'FirstClass',
  isEnabled: false,
};

export function SettingsView() {
  const providers = useProviders();
  const system = useSystemInfo();
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProviderForm>(EMPTY_PROVIDER_FORM);

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

  function updateCreateForm<K extends keyof CreateProviderForm>(
    key: K,
    value: CreateProviderForm[K]
  ) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    setActionError(null);
  }

  async function createProvider(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);

    const providerId = createForm.providerId.trim();
    const name = createForm.name.trim();
    const version = createForm.version.trim();
    const dockerImage = createForm.dockerImage.trim();

    if (!providerId || !name || !version || !dockerImage) {
      setActionError('Provider ID, name, version, and image are required.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await providersApi.create({
        provider_id: providerId,
        name,
        version,
        docker_image: dockerImage,
        ...(createForm.description.trim() ? { description: createForm.description.trim() } : {}),
        support_level: createForm.supportLevel,
        is_enabled: createForm.isEnabled,
      });
      await providers.refetch();
      requestSystemInfoRefresh();
      setCreateForm(EMPTY_PROVIDER_FORM);
      setCreateOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create provider');
    } finally {
      setCreateSubmitting(false);
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
      <section className="console-surface-strong console-hairline overflow-hidden rounded-[3px] px-5 py-5">
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
            onClick={() => {
              setCreateOpen((current) => !current);
              setActionError(null);
            }}
            className="rounded-[2px] border border-[color:var(--line)] bg-black/10 px-4 py-2 text-sm font-semibold text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
            aria-expanded={createOpen}
            aria-controls="create-provider-panel"
          >
            {createOpen ? 'Cancel' : '+ New Provider'}
          </button>
        </div>
      </section>

      {createOpen && (
        <section
          id="create-provider-panel"
          className="console-surface console-hairline overflow-hidden rounded-[3px] px-5 py-5"
        >
          <form onSubmit={(event) => void createProvider(event)} className="space-y-4">
            <div>
              <p className="console-kicker">Register provider</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                New Provider
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                Add a provider definition to the local catalog. New providers default to disabled so
                you can review them before enabling runs.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Provider ID *">
                <input
                  value={createForm.providerId}
                  onChange={(event) => updateCreateForm('providerId', event.target.value)}
                  placeholder="e.g. local-copilot"
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
                />
              </Field>
              <Field label="Display name *">
                <input
                  value={createForm.name}
                  onChange={(event) => updateCreateForm('name', event.target.value)}
                  placeholder="e.g. Local Copilot"
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
                />
              </Field>
              <Field label="Version *">
                <input
                  value={createForm.version}
                  onChange={(event) => updateCreateForm('version', event.target.value)}
                  placeholder="e.g. 1.0.0"
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
                />
              </Field>
              <Field label="Support level">
                <select
                  value={createForm.supportLevel}
                  onChange={(event) => updateCreateForm('supportLevel', event.target.value)}
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
                >
                  <option value="FirstClass">FirstClass</option>
                  <option value="Experimental">Experimental</option>
                  <option value="Deprecated">Deprecated</option>
                </select>
              </Field>
            </div>

            <Field label="Docker image *">
              <input
                value={createForm.dockerImage}
                onChange={(event) => updateCreateForm('dockerImage', event.target.value)}
                placeholder="e.g. ghcr.io/example/provider:latest"
                className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 font-mono text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={createForm.description}
                onChange={(event) => updateCreateForm('description', event.target.value)}
                rows={3}
                placeholder="What is this provider used for?"
                className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
              />
            </Field>

            <label className="inline-flex items-center gap-2 text-sm text-[color:var(--foreground-soft)]">
              <input
                type="checkbox"
                checked={createForm.isEnabled}
                onChange={(event) => updateCreateForm('isEnabled', event.target.checked)}
                className="h-4 w-4 rounded-[2px] border border-[color:var(--line)] bg-black/15"
              />
              Enable provider immediately
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-[2px] border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={createSubmitting}
                className="rounded-[2px] border border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:color-mix(in_oklch,var(--accent)_24%,transparent)] disabled:opacity-60"
              >
                {createSubmitting ? 'Creating…' : 'Create Provider'}
              </button>
            </div>
          </form>
        </section>
      )}

      {actionError && <ErrorState message={actionError} />}

      <div className="console-surface rounded-[3px] p-4 text-sm">
        <p className="console-kicker">Workspace root</p>
        <p className="mt-2 break-all font-mono text-[color:var(--foreground-soft)]">
          {system.info?.workspace_root ?? '—'}
        </p>
      </div>

      <div className="console-surface overflow-hidden rounded-[3px]">
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
                    className="rounded-[2px] border border-[color:var(--line)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}
