import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeSecure - Security Scanner for Vibe-Coded Apps",
  description:
    "Find vulnerabilities, fix security issues, and improve SEO for apps built with Cursor, Bolt, v0, Lovable, and other AI coding tools. Instant analysis, pay with crypto.",
  keywords: [
    "security scanner",
    "vibe coding",
    "cursor security",
    "bolt.new security",
    "v0 security",
    "code audit",
    "vulnerability scanner",
    "SEO audit",
  ],
  openGraph: {
    title: "VibeSecure - Secure Your Vibe-Coded App",
    description:
      "AI-powered security scanning for apps built with Cursor, Bolt, v0 & more",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
