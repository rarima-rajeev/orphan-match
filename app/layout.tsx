import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orphan Match — The hidden cure",
  description: "An AI agent that searches four public science databases for existing medicines that might help a rare disease.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <header className="nav">
          <Link href="/" className="brand">Orphan Match</Link>
          <nav>
            <Link href="/">Find a match</Link>
            <Link href="/how-it-works">How the agent works</Link>
            <Link href="/results">Results &amp; decisions</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">A learning project by an AI product manager. Not medical advice.</footer>
      </body>
    </html>
  );
}
