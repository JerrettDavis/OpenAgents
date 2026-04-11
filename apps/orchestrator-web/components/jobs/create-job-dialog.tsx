'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jobsApi, ApiError } from '@/lib/api/client';
import { useWorkflows } from '@/lib/hooks/use-workflows';
import { useProviders } from '@/lib/hooks/use-providers';
import type { CreateJobFormValues } from '@/lib/types/domain';
import { Spinner } from '@/components/ui/spinner';

interface CreateJobDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (jobId: string) => void;
}

const EMPTY_FORM: CreateJobFormValues = {
  title: '',
  description: '',
  workflow_id: '',
  provider_id: 'claude-code',
  model: '',
  workspace_path: '',
};

export function CreateJobDialog({ open, onClose, onCreated }: CreateJobDialogProps) {
  const router = useRouter();
  const { workflows, loading: loadingWorkflows } = useWorkflows();
  const { providers, loading: loadingProviders } = useProviders();

  const [form, setForm] = useState<CreateJobFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const firstWorkflow = workflows[0];
    if (!form.workflow_id && firstWorkflow) {
      setForm((prev) => ({ ...prev, workflow_id: firstWorkflow.slug }));
    }
  }, [form.workflow_id, workflows]);

  useEffect(() => {
    const firstProvider = providers[0];
    if (!form.provider_id && firstProvider) {
      setForm((prev) => ({ ...prev, provider_id: firstProvider.provider_id }));
    }
  }, [form.provider_id, providers]);

  if (!open) return null;

  function update<K extends keyof CreateJobFormValues>(key: K, value: CreateJobFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const title = form.title.trim();
    const workflow_id = form.workflow_id.trim();
    const provider_id = form.provider_id.trim();
    const workspace_path = form.workspace_path.trim();

    if (!title) {
      setSubmitError('Title is required.');
      return;
    }
    if (!workflow_id) {
      setSubmitError('Workflow is required.');
      return;
    }
    if (!provider_id) {
      setSubmitError('Provider is required.');
      return;
    }
    if (!workspace_path) {
      setSubmitError('Workspace path is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const descTrimmed = form.description.trim();
      const modelTrimmed = form.model.trim();
      const job = await jobsApi.create({
        title,
        ...(descTrimmed ? { description: descTrimmed } : {}),
        workflow_id,
        provider_id,
        ...(modelTrimmed ? { model: modelTrimmed } : {}),
        workspace_path,
      });

      setForm(EMPTY_FORM);
      onCreated?.(job.id);
      router.push(`/jobs/${job.id}`);
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create job';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-job-title"
        className="console-surface-strong relative w-full max-w-2xl overflow-hidden rounded-xl shadow-2xl"
      >
        <div className="console-hairline flex items-start justify-between gap-4 border-b border-[color:var(--line)] px-6 py-5">
          <div>
            <p className="console-kicker">Queue run</p>
            <h2
              id="create-job-title"
              className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]"
            >
              New Job
            </h2>
            <p className="mt-2 text-sm text-[color:var(--foreground-muted)]">
              Choose the workflow, provider, and workspace before dispatching the run.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[color:var(--line)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                Title <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Plan the OpenAgents repo"
                autoFocus
                className="w-full rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                Prompt / Request
              </span>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What should this agent run do? Include goals, constraints, and expected output."
                rows={2}
                className="w-full resize-none rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                Workflow <span className="text-red-400">*</span>
              </span>
              {loadingWorkflows ? (
                <div className="flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3">
                  <Spinner size="xs" />
                  <span className="text-xs text-[color:var(--foreground-muted)]">
                    Loading workflows…
                  </span>
                </div>
              ) : workflows.length > 0 ? (
                <select
                  value={form.workflow_id}
                  onChange={(e) => update('workflow_id', e.target.value)}
                  className="w-full rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
                >
                  <option value="">Select workflow…</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.slug}>
                      {w.name} ({w.version})
                    </option>
                  ))}
                </select>
              ) : (
                /* Workflows API not available yet — allow freetext */
                <input
                  type="text"
                  value={form.workflow_id}
                  onChange={(e) => update('workflow_id', e.target.value)}
                  placeholder="e.g. planning"
                  className="w-full rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
                />
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                  Provider <span className="text-red-400">*</span>
                </span>
                {loadingProviders ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3">
                    <Spinner size="xs" />
                    <span className="text-xs text-[color:var(--foreground-muted)]">
                      Loading providers…
                    </span>
                  </div>
                ) : providers.length > 0 ? (
                  <select
                    value={form.provider_id}
                    onChange={(e) => update('provider_id', e.target.value)}
                    className="w-full rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.provider_id}>
                        {p.name} ({p.provider_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.provider_id}
                    onChange={(e) => update('provider_id', e.target.value)}
                    placeholder="e.g. claude-code"
                    className="w-full rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
                  />
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                  Model
                </span>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => update('model', e.target.value)}
                  placeholder="e.g. claude-sonnet-4-5"
                  className="w-full rounded-lg border border-[color:var(--line)] bg-black/15 px-4 py-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                Workspace path <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={form.workspace_path}
                onChange={(e) => update('workspace_path', e.target.value)}
                placeholder="/workspace/my-project"
                className="w-full rounded-[1rem] border border-[color:var(--line)] bg-black/15 px-4 py-3 font-mono text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] outline-none transition focus:border-[color:var(--line-strong)] focus:bg-black/20"
              />
            </label>
          </div>

          {submitError && (
            <p className="mt-4 rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-[color:var(--line)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md border border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:color-mix(in_oklch,var(--accent)_24%,transparent)] disabled:opacity-60"
            >
              {submitting && <Spinner size="xs" />}
              {submitting ? 'Creating…' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
