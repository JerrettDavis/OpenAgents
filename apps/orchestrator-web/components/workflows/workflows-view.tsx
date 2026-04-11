'use client';

import { useState } from 'react';
import { workflowsApi } from '@/lib/api/client';
import { useWorkflows } from '@/lib/hooks/use-workflows';
import { requestSystemInfoRefresh } from '@/lib/hooks/use-system-info';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

interface CreateWorkflowForm {
  name: string;
  slug: string;
  version: string;
  category: string;
  description: string;
  isEnabled: boolean;
  isExperimental: boolean;
}

const EMPTY_WORKFLOW_FORM: CreateWorkflowForm = {
  name: '',
  slug: '',
  version: '',
  category: 'general',
  description: '',
  isEnabled: false,
  isExperimental: false,
};

export function WorkflowsView() {
  const { workflows, loading, error, refetch } = useWorkflows();
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateWorkflowForm>(EMPTY_WORKFLOW_FORM);

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

  function updateCreateForm<K extends keyof CreateWorkflowForm>(
    key: K,
    value: CreateWorkflowForm[K]
  ) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    setActionError(null);
  }

  async function createWorkflow(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);

    const name = createForm.name.trim();
    const slug = createForm.slug.trim();
    const version = createForm.version.trim();

    if (!name || !slug || !version) {
      setActionError('Name, slug, and version are required.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await workflowsApi.create({
        name,
        slug,
        version,
        ...(createForm.description.trim() ? { description: createForm.description.trim() } : {}),
        category: createForm.category.trim() || 'general',
        is_enabled: createForm.isEnabled,
        is_experimental: createForm.isExperimental,
      });
      await refetch();
      requestSystemInfoRefresh();
      setCreateForm(EMPTY_WORKFLOW_FORM);
      setCreateOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setCreateSubmitting(false);
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
            onClick={() => {
              setCreateOpen((current) => !current);
              setActionError(null);
            }}
            className="rounded-[2px] border border-[color:var(--line)] bg-black/10 px-4 py-2 text-sm font-semibold text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
            aria-expanded={createOpen}
            aria-controls="create-workflow-panel"
          >
            {createOpen ? 'Cancel' : '+ New Workflow'}
          </button>
        </div>
      </section>

      {createOpen && (
        <section
          id="create-workflow-panel"
          className="console-surface console-hairline overflow-hidden rounded-[3px] px-5 py-5"
        >
          <form onSubmit={(event) => void createWorkflow(event)} className="space-y-4">
            <div>
              <p className="console-kicker">Register workflow</p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                New Workflow
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                Add a workflow definition to the local catalog. New workflows default to disabled so
                you can review compatibility before activating them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name *">
                <input
                  value={createForm.name}
                  onChange={(event) => updateCreateForm('name', event.target.value)}
                  placeholder="e.g. Release review"
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
                />
              </Field>
              <Field label="Slug *">
                <input
                  value={createForm.slug}
                  onChange={(event) => updateCreateForm('slug', event.target.value)}
                  placeholder="e.g. release-review"
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 font-mono text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
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
              <Field label="Category">
                <input
                  value={createForm.category}
                  onChange={(event) => updateCreateForm('category', event.target.value)}
                  placeholder="e.g. operations"
                  className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={createForm.description}
                onChange={(event) => updateCreateForm('description', event.target.value)}
                rows={3}
                placeholder="What is this workflow for?"
                className="w-full rounded-[2px] border border-[color:var(--line)] bg-black/15 px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)]"
              />
            </Field>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--foreground-soft)]">
                <input
                  type="checkbox"
                  checked={createForm.isEnabled}
                  onChange={(event) => updateCreateForm('isEnabled', event.target.checked)}
                  className="h-4 w-4 rounded-[2px] border border-[color:var(--line)] bg-black/15"
                />
                Enable workflow immediately
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--foreground-soft)]">
                <input
                  type="checkbox"
                  checked={createForm.isExperimental}
                  onChange={(event) => updateCreateForm('isExperimental', event.target.checked)}
                  className="h-4 w-4 rounded-[2px] border border-[color:var(--line)] bg-black/15"
                />
                Mark as experimental
              </label>
            </div>

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
                {createSubmitting ? 'Creating…' : 'Create Workflow'}
              </button>
            </div>
          </form>
        </section>
      )}

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
