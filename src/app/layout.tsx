import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtomQuest Goal Portal",
  description: "In-house goal setting and tracking portal MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
