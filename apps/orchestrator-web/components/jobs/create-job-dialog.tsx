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
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-job-title"
        className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 id="create-job-title" className="text-sm font-semibold text-zinc-100">
            New Job
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5">
          <div className="space-y-4">
            {/* Title */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Title <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Plan the OpenAgents repo"
                autoFocus
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              />
            </label>

            {/* Prompt / Request */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Prompt / Request
              </span>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What should this agent run do? Include goals, constraints, and expected output."
                rows={2}
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              />
            </label>

            {/* Workflow */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Workflow <span className="text-red-400">*</span>
              </span>
              {loadingWorkflows ? (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                  <Spinner size="xs" />
                  <span className="text-xs text-zinc-500">Loading workflows…</span>
                </div>
              ) : workflows.length > 0 ? (
                <select
                  value={form.workflow_id}
                  onChange={(e) => update('workflow_id', e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500"
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
                />
              )}
            </label>

            {/* Provider + Model row */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Provider <span className="text-red-400">*</span>
                </span>
                {loadingProviders ? (
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                    <Spinner size="xs" />
                    <span className="text-xs text-zinc-500">Loading providers…</span>
                  </div>
                ) : providers.length > 0 ? (
                  <select
                    value={form.provider_id}
                    onChange={(e) => update('provider_id', e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500"
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
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
                  />
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Model</span>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => update('model', e.target.value)}
                  placeholder="e.g. claude-sonnet-4-5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
                />
              </label>
            </div>

            {/* Workspace path */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Workspace path <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={form.workspace_path}
                onChange={(e) => update('workspace_path', e.target.value)}
                placeholder="/workspace/my-project"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
              />
            </label>
          </div>

          {/* Error */}
          {submitError && (
            <p className="mt-3 rounded-lg border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
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
