import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenSwap",
  description: "Find open-source alternatives by describing what you want to replace or selecting a starter swap.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
