import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
