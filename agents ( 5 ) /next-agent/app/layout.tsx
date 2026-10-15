import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

// next/font downloads the font at build time and self-hosts it: no extra network request, no layout shift.
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Next Agent",
  description: "A chat agent that calls tools (weather, location, calculator, Wikipedia), built with Next.js and the Vercel AI SDK",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
