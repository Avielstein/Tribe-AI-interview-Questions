import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import KeyBanner from "@/components/KeyBanner";
import KeyNavLink, { KeyLink } from "@/components/KeyNavLink";
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
          <nav className="mx-auto flex max-w-4xl items-center px-4 py-2 text-sm">
            <div className="flex items-center gap-1">
              <Link
                href="/"
                aria-label="Intake Triage home"
                title="Home"
                className="rounded-full p-2 text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface"
              >
                {/* Material "home" icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </Link>
              <Suspense fallback={<KeyLink />}>
                <KeyNavLink />
              </Suspense>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
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
