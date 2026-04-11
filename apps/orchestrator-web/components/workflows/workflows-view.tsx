'use client';

import { useState } from 'react';
import { workflowsApi } from '@/lib/api/client';
import { useWorkflows } from '@/lib/hooks/use-workflows';
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
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Workflows</h1>
          <p className="mt-1 text-xs text-zinc-500">Workflow definitions and status.</p>
        </div>
        <button
          onClick={() => void createWorkflow()}
          disabled={createPending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {createPending ? 'Creating…' : '+ New Workflow'}
        </button>
      </div>

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
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-2 text-left text-zinc-500">Name</th>
                <th className="px-4 py-2 text-left text-zinc-500">Slug</th>
                <th className="px-4 py-2 text-left text-zinc-500">Version</th>
                <th className="px-4 py-2 text-left text-zinc-500">Category</th>
                <th className="px-4 py-2 text-left text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {workflows.map((w) => (
                <tr key={w.id} className="bg-zinc-900/40">
                  <td className="px-4 py-2 text-zinc-200">{w.name}</td>
                  <td className="px-4 py-2 font-mono text-zinc-500">{w.slug}</td>
                  <td className="px-4 py-2 text-zinc-400">{w.version}</td>
                  <td className="px-4 py-2 text-zinc-400">{w.category}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => void toggleWorkflow(w.slug, w.is_enabled)}
                      className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500"
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
