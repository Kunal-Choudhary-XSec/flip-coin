import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
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
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <ContractBanner />
            <main className="container flex-1 py-8">{children}</main>
            <footer className="border-t py-6">
              <div className="container text-center text-xs text-muted-foreground">
                Stellar CoinFlip · Soroban smart contract on Stellar Testnet ·
                For demo purposes only
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
