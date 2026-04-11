'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useSystemInfo } from '@/lib/hooks/use-system-info';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exactMatch?: boolean;
}

// ── SVG icon primitives ───────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".7" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".7" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".7" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".7" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="3" width="13" height="1.5" rx=".75" fill="currentColor" />
      <rect x="1" y="6.75" width="13" height="1.5" rx=".75" fill="currentColor" />
      <rect x="1" y="10.5" width="13" height="1.5" rx=".75" fill="currentColor" />
    </svg>
  );
}

function IconFlow() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="3" cy="3" r="2" fill="currentColor" opacity=".7" />
      <circle cx="12" cy="7.5" r="2" fill="currentColor" opacity=".7" />
      <circle cx="3" cy="12" r="2" fill="currentColor" opacity=".7" />
      <path
        d="M5 3h3.5a1 1 0 0 1 1 1v1.5M5 12h3.5a1 1 0 0 0 1-1V8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".5"
      />
    </svg>
  );
}

function IconAgent() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M1.5 13.5c0-3.314 2.686-5 6-5s6 1.686 6 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M7.5 1.5 L13.5 4.5 L13.5 10.5 L7.5 13.5 L1.5 10.5 L1.5 4.5 Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M7.5 1.5 L7.5 13.5 M1.5 4.5 L13.5 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".5"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5 7.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.07 1.24a1.5 1.5 0 0 1 2.86 0l.17.52a1 1 0 0 0 1.33.6l.5-.2a1.5 1.5 0 0 1 2.02 2.02l-.2.5a1 1 0 0 0 .6 1.33l.52.17a1.5 1.5 0 0 1 0 2.86l-.52.17a1 1 0 0 0-.6 1.33l.2.5a1.5 1.5 0 0 1-2.02 2.02l-.5-.2a1 1 0 0 0-1.33.6l-.17.52a1.5 1.5 0 0 1-2.86 0l-.17-.52a1 1 0 0 0-1.33-.6l-.5.2a1.5 1.5 0 0 1-2.02-2.02l.2-.5a1 1 0 0 0-.6-1.33l-.52-.17a1.5 1.5 0 0 1 0-2.86l.52-.17a1 1 0 0 0 .6-1.33l-.2-.5a1.5 1.5 0 0 1 2.02-2.02l.5.2a1 1 0 0 0 1.33-.6l.17-.52Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity=".6"
      />
    </svg>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { href: '/jobs', label: 'Jobs', icon: <IconList />, exactMatch: false },
  {
    href: '/workflows',
    label: 'Workflows',
    icon: <IconFlow />,
    exactMatch: false,
  },
  {
    href: '/agents',
    label: 'Agents',
    icon: <IconAgent />,
    exactMatch: false,
  },
  {
    href: '/artifacts',
    label: 'Artifacts',
    icon: <IconBox />,
    exactMatch: false,
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { info, loading, error } = useSystemInfo();
  const providersLoaded = info?.providers_loaded.length ?? 0;
  const workflowsLoaded = info?.workflows_loaded.length ?? 0;
  const runtimeReady = providersLoaded > 0 && workflowsLoaded > 0;
  const runtimePartial = !runtimeReady && (providersLoaded > 0 || workflowsLoaded > 0);
  const runtimeState = error
    ? 'unavailable'
    : loading
      ? 'checking'
      : runtimeReady
        ? 'ready'
        : runtimePartial
          ? 'partial'
          : 'empty';
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col overflow-hidden border-r border-[color:var(--line)] bg-[color:color-mix(in_oklch,var(--surface-strong)_96%,black_4%)]">
      <div className="console-hairline flex items-start gap-3 border-b border-[color:var(--line)] px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[color:color-mix(in_oklch,var(--line-strong)_42%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_88%,transparent)] text-xs font-black tracking-[0.14em] text-[color:var(--accent)]">
          OA
        </div>
        <div className="min-w-0">
          <p className="console-kicker">Control room</p>
          <p className="mt-1 text-base font-semibold text-[color:var(--foreground)]">OpenAgents</p>
          <p className="mt-1 max-w-[13rem] text-xs leading-5 text-[color:var(--foreground-muted)]">
            Headless agent orchestration across the required provider pack.
          </p>
        </div>
      </div>

      <div className="px-3 pt-3">
        <div className="border border-[color:var(--line)] bg-black/12 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="console-kicker">Runtime</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                {runtimeState === 'ready'
                  ? 'Fleet ready'
                  : runtimeState === 'partial'
                    ? 'Runtime partial'
                    : runtimeState === 'empty'
                      ? 'Runtime inventory'
                      : runtimeState === 'unavailable'
                        ? 'Runtime unavailable'
                        : 'Checking runtime'}
              </p>
            </div>
            <div
              className={cn(
                'rounded-[4px] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]',
                runtimeState === 'ready'
                  ? 'border border-emerald-800/80 bg-emerald-950/60 text-emerald-200'
                  : runtimeState === 'partial'
                    ? 'border border-amber-800/80 bg-amber-950/60 text-amber-200'
                    : runtimeState === 'unavailable'
                      ? 'border border-red-900/70 bg-red-950/30 text-red-200'
                      : 'border border-[color:var(--line)] bg-black/10 text-[color:var(--foreground-muted)]'
              )}
            >
              {runtimeState === 'ready'
                ? 'Ready'
                : runtimeState === 'partial'
                  ? 'Partial'
                  : runtimeState === 'empty'
                    ? 'Empty'
                    : runtimeState === 'unavailable'
                      ? 'Offline'
                      : 'Checking'}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-[color:var(--line)] border border-[color:var(--line)] bg-[color:color-mix(in_oklch,var(--surface)_72%,black_28%)] text-sm">
            <div className="px-3 py-2">
              <p className="console-label">Providers</p>
              <p
                data-testid="sidebar-providers-count"
                className="mt-1 text-lg font-semibold text-[color:var(--foreground)]"
              >
                {providersLoaded}
              </p>
            </div>
            <div className="px-3 py-2">
              <p className="console-label">Workflows</p>
              <p
                data-testid="sidebar-workflows-count"
                className="mt-1 text-lg font-semibold text-[color:var(--foreground)]"
              >
                {workflowsLoaded}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        <div className="mb-3 px-2">
          <p className="console-kicker">Operate</p>
        </div>
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exactMatch
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'border border-[color:color-mix(in_oklch,var(--line-strong)_45%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_86%,transparent)] text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'border border-transparent text-[color:var(--foreground-soft)] hover:border-[color:var(--line)] hover:bg-[color:color-mix(in_oklch,var(--surface)_74%,transparent)] hover:text-[color:var(--foreground)]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border transition',
                      isActive
                        ? 'border-[color:color-mix(in_oklch,var(--line-strong)_52%,transparent)] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] text-[color:var(--accent)]'
                        : 'border-[color:var(--line)] bg-black/10 text-[color:var(--foreground-muted)] group-hover:border-[color:color-mix(in_oklch,var(--line-strong)_36%,transparent)] group-hover:text-[color:var(--foreground-soft)]'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[color:var(--foreground-muted)]">
                      {item.href === '/jobs' && 'Queue, watch, and control runs'}
                      {item.href === '/workflows' && 'Inspect available orchestration plans'}
                      {item.href === '/agents' && 'Review provider inventory and support'}
                      {item.href === '/artifacts' && 'Browse generated workspace outputs'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-[color:var(--line)] pt-4">
          <div className="mb-3 px-2">
            <p className="console-kicker">Configure</p>
          </div>
          <Link
            href="/settings"
            className={cn(
              'group flex items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-medium transition',
              isSettingsActive
                ? 'border border-[color:color-mix(in_oklch,var(--line-strong)_45%,transparent)] bg-[color:color-mix(in_oklch,var(--surface-strong)_86%,transparent)] text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'border border-transparent text-[color:var(--foreground-soft)] hover:border-[color:var(--line)] hover:bg-[color:color-mix(in_oklch,var(--surface)_74%,transparent)] hover:text-[color:var(--foreground)]'
            )}
            aria-current={isSettingsActive ? 'page' : undefined}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border transition',
                isSettingsActive
                  ? 'border-[color:color-mix(in_oklch,var(--line-strong)_52%,transparent)] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] text-[color:var(--accent)]'
                  : 'border-[color:var(--line)] bg-black/10 text-[color:var(--foreground-muted)] group-hover:border-[color:color-mix(in_oklch,var(--line-strong)_36%,transparent)] group-hover:text-[color:var(--foreground-soft)]'
              )}
            >
              <IconGear />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">Settings</span>
              <span className="mt-0.5 block text-xs text-[color:var(--foreground-muted)]">
                Provider toggles and runtime controls
              </span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="border-t border-[color:var(--line)] bg-black/12 px-4 py-3 text-xs text-[color:var(--foreground-muted)]">
        <p className="console-kicker">Matrix</p>
        <p className="mt-2 leading-5">
          {runtimeState === 'unavailable'
            ? 'System info is unavailable right now.'
            : runtimeState === 'partial'
              ? `${providersLoaded} providers and ${workflowsLoaded} workflows are loaded. Enable both inventories to launch jobs cleanly.`
              : runtimeState === 'empty'
                ? 'No providers or workflows are loaded yet.'
                : `${providersLoaded} providers loaded across ${workflowsLoaded} workflows.`}
        </p>
      </div>
    </aside>
  );
}
