import { DashboardShell } from '@/components/layout/dashboard-shell';

/**
 * Layout for the (dashboard) route group.
 * Currently unused since jobs live outside this group, but ready for a
 * future /overview or /metrics page.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
