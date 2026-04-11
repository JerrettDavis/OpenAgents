'use client';

import { useEffect, useState } from 'react';
import { systemApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

function HealthDot({ healthy }: { healthy: boolean | null }) {
  return (
    <span
      title={
        healthy === null ? 'Checking backend…' : healthy ? 'Backend healthy' : 'Backend unreachable'
      }
      className={cn(
        'h-2 w-2 rounded-full transition-colors',
        healthy === null && 'bg-zinc-600',
        healthy === true && 'bg-emerald-500',
        healthy === false && 'bg-red-500'
      )}
    />
  );
}

export function TopBar() {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await systemApi.health();
        if (!cancelled) setHealthy(res.status === 'healthy');
      } catch {
        if (!cancelled) setHealthy(false);
      }
    }

    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
      {/* Left: breadcrumb slot (filled by pages via context in future) */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="font-mono">orchestrator</span>
      </div>

      {/* Right: status + future actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <HealthDot healthy={healthy} />
          <span className="text-xs text-zinc-500">
            {healthy === null ? 'Connecting…' : healthy ? 'API online' : 'API offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
