import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OpenAgents',
    template: '%s | OpenAgents',
  },
  description: 'Container-first orchestration platform for agentic CLI tools',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#app-main"
          className="absolute left-4 top-4 z-50 -translate-y-16 rounded-[4px] border border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--foreground)] transition focus:translate-y-0 focus:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
