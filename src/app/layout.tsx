import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MORA — Your story, well told",
  description: "A consent-first AI portfolio generator for the work and proof you choose to share.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
