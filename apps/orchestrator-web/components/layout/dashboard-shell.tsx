import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Root layout shell: fixed sidebar + top bar + scrollable content area.
 * Server component — interactive sub-components handle their own state.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_18%),linear-gradient(180deg,transparent,rgba(0,0,0,0.08))]" />
      <div className="relative m-3 flex h-[calc(100vh-1.5rem)] w-full overflow-hidden rounded-none border border-[color:var(--line-strong)] bg-[color:color-mix(in_oklch,var(--surface)_90%,black_10%)] shadow-[0_18px_46px_rgba(0,0,0,0.28)]">
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col bg-[color:color-mix(in_oklch,var(--background)_80%,var(--surface)_20%)]">
          <TopBar />
          <main id="app-main" className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-3 lg:px-4 lg:py-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
