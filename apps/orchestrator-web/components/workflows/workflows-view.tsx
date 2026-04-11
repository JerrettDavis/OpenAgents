'use client';

import { useState } from 'react';
import { workflowsApi } from '@/lib/api/client';
import { useWorkflows } from '@/lib/hooks/use-workflows';
import { requestSystemInfoRefresh } from '@/lib/hooks/use-system-info';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export function WorkflowsView() {
  const { workflows, loading, error, refetch } = useWorkflows();
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleWorkflow(slug: string, isEnabled: boolean) {
    setActionError(null);
    try {
      await workflowsApi.update(slug, { is_enabled: !isEnabled });
      await refetch();
      requestSystemInfoRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update workflow');
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <section className="console-surface-strong console-hairline overflow-hidden rounded-[3px] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div>
              <p className="console-kicker">Workflow catalog</p>
              <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
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
            type="button"
            disabled
            title="Workflow creation UI is not shipped yet"
            className="rounded-[2px] border border-[color:var(--line)] bg-black/10 px-4 py-2 text-sm font-semibold text-[color:var(--foreground-muted)] opacity-70"
          >
            + New Workflow
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
        <div className="console-surface overflow-hidden rounded-[3px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] bg-black/10 text-left text-[11px] uppercase tracking-[0.08em] text-[color:var(--foreground-muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {workflows.map((w) => (
                <tr key={w.id} className="bg-black/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3.5 text-[color:var(--foreground)]">{w.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[color:var(--foreground-muted)]">
                    {w.slug}
                  </td>
                  <td className="px-4 py-3.5 text-[color:var(--foreground-soft)]">{w.version}</td>
                  <td className="px-4 py-3.5 text-[color:var(--foreground-soft)]">{w.category}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => void toggleWorkflow(w.slug, w.is_enabled)}
                      className="rounded-[2px] border border-[color:var(--line)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
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
