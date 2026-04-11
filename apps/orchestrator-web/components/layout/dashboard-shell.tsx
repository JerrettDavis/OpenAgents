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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(199,165,87,0.12),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.12))]" />
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:px-5 lg:py-4">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
