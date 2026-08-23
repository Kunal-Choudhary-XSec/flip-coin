import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ContractBanner } from "@/components/shared/contract-banner";

export const metadata: Metadata = {
  title: "Stellar CoinFlip — P2P coin flips on Soroban",
  description:
    "A peer-to-peer coin flip game on Stellar. Create a room, lock an entry fee, and win the pot — powered by a Soroban smart contract on testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          {/* Liquid glass aurora backdrop */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute -top-48 left-1/2 h-[520px] w-[820px] -translate-x-1/2 animate-aurora rounded-full bg-amber-400/15 blur-[130px] dark:bg-amber-400/10" />
            <div className="absolute -right-32 top-1/4 h-[420px] w-[520px] animate-aurora rounded-full bg-violet-500/10 blur-[130px] [animation-delay:-5s] dark:bg-violet-500/[0.07]" />
            <div className="absolute -left-32 bottom-0 h-[380px] w-[480px] animate-aurora rounded-full bg-cyan-400/10 blur-[120px] [animation-delay:-9s] dark:bg-cyan-400/[0.06]" />
          </div>

          <div className="flex min-h-screen flex-col">
            <Navbar />
            <ContractBanner />
            <main className="container flex-1 py-10">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
