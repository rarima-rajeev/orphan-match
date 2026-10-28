import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

const LINKS = [
  ["Portfolio", "https://rarima-rajeev.my.canva.site/"],
  ["LinkedIn", "https://www.linkedin.com/in/rarima-rajeev"],
  ["GitHub", "https://github.com/rarima-rajeev"],
];

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
        <footer className="footer">
          <div className="footer-links">
            {LINKS.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>
            ))}
          </div>
          <p>An independent project. Not affiliated with any company or agency. Not medical advice.</p>
        </footer>
      </body>
    </html>
  );
}
