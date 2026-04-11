'use client';

import { useState } from 'react';
import { workflowsApi } from '@/lib/api/client';
import { useWorkflows } from '@/lib/hooks/use-workflows';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export function WorkflowsView() {
  const { workflows, loading, error, refetch } = useWorkflows();
  const [createPending, setCreatePending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function createWorkflow() {
    setCreatePending(true);
    setActionError(null);
    try {
      const ts = Date.now();
      await workflowsApi.create({
        name: `Workflow ${ts}`,
        slug: `wf-${ts}`,
        version: '1.0.0',
        description: 'Created from dashboard',
        category: 'general',
        is_enabled: true,
      });
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setCreatePending(false);
    }
  }

  async function toggleWorkflow(slug: string, isEnabled: boolean) {
    setActionError(null);
    try {
      await workflowsApi.update(slug, { is_enabled: !isEnabled });
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update workflow');
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <section className="console-surface-strong console-hairline overflow-hidden rounded-xl px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="console-kicker">Workflow catalog</p>
              <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                Workflows
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                Keep orchestration definitions enabled, compatible, and easy to scan before you
                dispatch work into the queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{workflows.length} workflows loaded</Badge>
              <Badge variant="success">
                {workflows.filter((workflow) => workflow.is_enabled).length} enabled
              </Badge>
            </div>
          </div>
          <button
            onClick={() => void createWorkflow()}
            disabled={createPending}
            className="rounded-md border border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:color-mix(in_oklch,var(--accent)_24%,transparent)] disabled:opacity-60"
          >
            {createPending ? 'Creating…' : '+ New Workflow'}
          </button>
        </div>
      </section>

      {actionError && <ErrorState message={actionError} />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : workflows.length === 0 ? (
        <EmptyState title="No workflows" description="No workflows were returned." />
      ) : (
        <div className="console-surface overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] bg-black/5 text-left text-[color:var(--foreground-muted)]">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {workflows.map((w) => (
                <tr key={w.id} className="bg-black/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-4 text-[color:var(--foreground)]">{w.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[color:var(--foreground-muted)]">
                    {w.slug}
                  </td>
                  <td className="px-5 py-4 text-[color:var(--foreground-soft)]">{w.version}</td>
                  <td className="px-5 py-4 text-[color:var(--foreground-soft)]">{w.category}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => void toggleWorkflow(w.slug, w.is_enabled)}
                      className="rounded-md border border-[color:var(--line)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
                    >
                      {w.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
