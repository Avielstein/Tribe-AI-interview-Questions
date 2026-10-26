import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import KeyBanner from "@/components/KeyBanner";
import ThemeToggle, { themeInitScript } from "@/components/ThemeToggle";
import "./globals.css";

// Roboto: Material Design's typeface.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intake Triage",
  description: "Triage inbound project requests with AI-generated summaries, tags, and risks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        <header className="border-b border-outline-variant bg-surface-container-low">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 text-sm">
            <Link href="/" className="text-base font-medium">
              Intake Triage
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/settings"
                aria-label="API key settings"
                title="API key"
                className="rounded-full p-2 text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface"
              >
                {/* Material "key" icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
              </Link>
            </div>
          </nav>
        </header>
        <Suspense fallback={null}>
          <KeyBanner />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
