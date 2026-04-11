'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

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

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      {/* Logo */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-4">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white shadow-md shadow-indigo-900/40">
          OA
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-100">OpenAgents</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exactMatch
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-indigo-400' : 'text-zinc-500'
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom section — future: settings */}
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <span className="shrink-0">
              <IconGear />
            </span>
            Settings
          </Link>
        </div>
      </nav>
    </aside>
  );
}
