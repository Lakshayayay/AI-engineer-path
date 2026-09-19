import type { Metadata } from "next";
import { Carter_One, Roboto_Slab } from "next/font/google";
import "./globals.css";

const carterOne = Carter_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-carter",
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-slab",
});

export const metadata: Metadata = {
  title: { default: "PopStream", template: "%s · PopStream" },
  description: "Find a film the way you'd describe it to a friend. Free classics to watch, and a home screen that learns your taste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${carterOne.variable} ${robotoSlab.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
