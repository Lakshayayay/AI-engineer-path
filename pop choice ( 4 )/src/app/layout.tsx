import type { Metadata } from "next";
import { Carter_One, Roboto_Slab } from "next/font/google";
import "./globals.css";

const carterOne = Carter_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-carter-one",
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
});

export const metadata: Metadata = {
  title: "Pop Choice",
  description: "AI Movie Recommendations",
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
