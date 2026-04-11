import type { Metadata } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const bodyFont = IBM_Plex_Sans({
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

const monoFont = JetBrains_Mono({
  variable: '--font-geist-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
});

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
    <html lang="en" className={`${bodyFont.variable} ${monoFont.variable} h-full antialiased`}>
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
