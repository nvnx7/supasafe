import "./globals.css";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "supasafe",
  description: "Private multisig accounts on Starknet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
