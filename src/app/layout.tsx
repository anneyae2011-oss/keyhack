import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NanaTwo — AI Gateway",
  description: "Premium AI Gateway with automatic key fallback",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-cyber-darker text-cyber-text font-mono antialiased">{children}</body>
    </html>
  );
}
