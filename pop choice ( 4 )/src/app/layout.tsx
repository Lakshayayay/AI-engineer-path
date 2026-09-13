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
      <body
        className={`${carterOne.variable} ${robotoSlab.variable} antialiased bg-gray-900 min-h-screen flex items-center justify-center`}
      >
        <div className="relative w-full h-screen md:w-[393px] md:h-[852px] md:rounded-[40px] md:border-[12px] md:border-black md:shadow-2xl overflow-hidden bg-[#000c36]">
          {/* Optional: Add a notch simulation on desktop */}
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-b-[20px] z-50"></div>
          
          <div className="w-full h-full overflow-y-auto overflow-x-hidden relative">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
