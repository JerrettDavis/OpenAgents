import type { Metadata } from 'next';
import { JobDetailView } from '@/components/jobs/job-detail-view';

export const metadata: Metadata = {
  title: 'Job Detail',
};

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;

  // Basic sanity check — reject obviously malformed IDs before hitting the API.
  // Job IDs from the orchestrator are non-empty slugs (job_abc123, UUIDs, etc.).
  // We intentionally avoid strict UUID-only validation since the API contract
  // does not mandate UUIDs.
  if (!id || id.length > 128 || !/^[\w-]+$/.test(id)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm text-zinc-400">Invalid job ID.</p>
        <a
          href="/jobs"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:border-zinc-500"
        >
          ← Back to Jobs
        </a>
      </div>
    );
  }

  return <JobDetailView jobId={id} />;
}
