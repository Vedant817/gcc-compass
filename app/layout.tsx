import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/toast";

// Fonts are vendored in app/fonts so the build never depends on reaching
// Google Fonts (a build-time fetch that fails the whole deployment).
// Both families are variable fonts; the CSS variables they set are consumed
// by globals.css.
const sourceSerif = localFont({
  src: "./fonts/sourceserif4-variable.woff2",
  weight: "200 900",
  style: "normal",
  variable: "--font-source-serif",
  display: "swap",
});

const jost = localFont({
  src: "./fonts/jost-variable.woff2",
  weight: "100 900",
  style: "normal",
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
        <ToastProvider>
          <SiteHeader />
          <main className="flex-1 w-full max-w-page mx-auto px-6 py-6">{children}</main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
