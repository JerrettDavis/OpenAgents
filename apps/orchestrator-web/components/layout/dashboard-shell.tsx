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
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
