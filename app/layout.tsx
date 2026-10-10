import type { Metadata } from "next";
import { Source_Serif_4, Jost } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GCC Compass — a sourced registry for setting up a Global Capability Centre in India",
  description:
    "Every published number, side by side with its source, date, definition and confidence. City ranking, incentive eligibility, a 3-year cost estimate, and a registry you can add to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${jost.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 w-full max-w-page mx-auto px-6 py-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
