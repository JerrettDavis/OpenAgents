import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-6 text-zinc-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 font-mono text-2xl text-zinc-400">
        404
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This page doesn&apos;t exist yet or may be in a future milestone.
        </p>
      </div>
      <Link
        href="/jobs"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        ← Back to Jobs
      </Link>
    </div>
  );
}
