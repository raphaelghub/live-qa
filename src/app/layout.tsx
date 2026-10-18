import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal — Live Q&A",
  description: "Self-hosted live audience Q&A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
