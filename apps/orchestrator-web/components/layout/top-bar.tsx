'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { systemApi } from '@/lib/api/client';
import { useSystemInfo } from '@/lib/hooks/use-system-info';
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
  const pathname = usePathname();
  const { info } = useSystemInfo();

  const pageMeta = useMemo(() => {
    if (pathname.startsWith('/jobs/')) {
      return {
        label: 'Run detail',
        title: 'Job inspection',
        description: 'Stream live execution, events, stages, and logs from one pane.',
      };
    }
    if (pathname.startsWith('/jobs')) {
      return {
        label: 'Operations',
        title: 'Jobs',
        description: 'Queue, filter, and intervene on provider-backed runs.',
      };
    }
    if (pathname.startsWith('/workflows')) {
      return {
        label: 'Catalog',
        title: 'Workflows',
        description: 'Track enabled orchestration plans and compatibility.',
      };
    }
    if (pathname.startsWith('/agents')) {
      return {
        label: 'Providers',
        title: 'Agents',
        description: 'Monitor the runtime inventory and support matrix.',
      };
    }
    if (pathname.startsWith('/artifacts')) {
      return {
        label: 'Outputs',
        title: 'Artifacts',
        description: 'Inspect workspaces and generated files by run.',
      };
    }
    if (pathname.startsWith('/settings')) {
      return {
        label: 'Runtime',
        title: 'Settings',
        description: 'Adjust provider state and inspect runtime roots.',
      };
    }
    return {
      label: 'Overview',
      title: 'OpenAgents',
      description: 'Container-first orchestration for CLI-native agent systems.',
    };
  }, [pathname]);

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
    <header className="border-b border-[color:var(--line)] bg-[color:color-mix(in_oklch,var(--surface)_74%,transparent)] px-4 py-3 backdrop-blur-xl lg:px-5">
      <div className="mx-auto flex w-full max-w-[1600px] items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="console-kicker">{pageMeta.label}</p>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <p className="text-2xl font-semibold text-[color:var(--foreground)]">
              {pageMeta.title}
            </p>
            <p className="pb-0.5 text-sm text-[color:var(--foreground-muted)]">
              {pageMeta.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusChip
            label="API"
            value={healthy === null ? 'Checking' : healthy ? 'Online' : 'Offline'}
            healthy={healthy}
          />
          <StatusChip label="Active jobs" value={String(info?.active_jobs ?? '—')} />
          <StatusChip label="Providers" value={String(info?.providers_loaded.length ?? '—')} />
          <StatusChip label="Workflows" value={String(info?.workflows_loaded.length ?? '—')} />
        </div>
      </div>
    </header>
  );
}

function StatusChip({
  label,
  value,
  healthy,
}: {
  label: string;
  value: string;
  healthy?: boolean | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-black/10 px-3 py-2 text-xs">
      {healthy !== undefined && <HealthDot healthy={healthy} />}
      <span className="font-medium uppercase tracking-[0.14em] text-[color:var(--foreground-muted)]">
        {label}
      </span>
      <span className="text-[color:var(--foreground)]">{value}</span>
    </div>
  );
}
