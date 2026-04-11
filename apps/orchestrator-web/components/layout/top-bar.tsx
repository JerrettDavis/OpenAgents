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
  const providersLoaded = info?.providers_loaded.length ?? 0;
  const workflowsLoaded = info?.workflows_loaded.length ?? 0;
  const activeJobs = info?.active_jobs ?? 0;

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
    <header className="border-b border-[color:var(--line)] bg-[color:color-mix(in_oklch,var(--surface)_88%,black_12%)] px-3 py-3 lg:px-4">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="console-kicker">{pageMeta.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold text-[color:var(--foreground)]">{pageMeta.title}</p>
            <p className="text-sm text-[color:var(--foreground-muted)]">{pageMeta.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end">
          <div className="flex flex-wrap overflow-hidden rounded-[2px] border border-[color:var(--line)] bg-black/12">
            <StatusChip
              label="API"
              value={healthy === null ? 'Checking' : healthy ? 'Online' : 'Offline'}
              healthy={healthy}
              first
            />
            <StatusChip label="Active jobs" value={String(activeJobs)} />
            <StatusChip label="Providers" value={String(providersLoaded)} />
            <StatusChip label="Workflows" value={String(workflowsLoaded)} />
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusChip({
  label,
  value,
  healthy,
  first = false,
}: {
  label: string;
  value: string;
  healthy?: boolean | null;
  first?: boolean;
}) {
  return (
    <div
      data-testid={`topbar-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 text-[11px]',
        !first && 'border-l border-[color:var(--line)]'
      )}
    >
      {healthy !== undefined && <HealthDot healthy={healthy} />}
      <span className="font-medium uppercase tracking-[0.08em] text-[color:var(--foreground-muted)]">
        {label}
      </span>
      <span className="text-[color:var(--foreground)]">{value}</span>
    </div>
  );
}
