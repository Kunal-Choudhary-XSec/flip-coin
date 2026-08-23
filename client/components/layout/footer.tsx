import Link from "next/link";
import { Coins, Github, Twitter } from "lucide-react";

const GITHUB_URL = "https://github.com/Kunal-Choudhary-XSec/flip-coin";
const X_URL = "https://x.com/KunalCY200511";

const ROUTES = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activity", label: "Activity" },
  { href: "/transactions", label: "Transactions" },
];

export function Footer() {
  return (
    <footer className="mt-12 px-3 pb-6">
      <div className="glass container rounded-3xl px-6 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <span className="glass-subtle flex h-9 w-9 items-center justify-center rounded-xl">
                <Coins className="h-5 w-5 text-primary" />
              </span>
              CoinFlip
            </div>
            <p className="text-sm text-muted-foreground">
              Provably fair P2P coin flips, escrowed by a Soroban smart
              contract on Stellar Testnet.
            </p>
          </div>

          {/* Routes */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Explore</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {ROUTES.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Connect</p>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                Source code on GitHub
              </a>
              <a
                href={X_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
                @KunalCY200511 on X
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-black/[0.06] pt-5 text-xs text-muted-foreground dark:border-white/[0.08] sm:flex-row">
          <span>
            Developed by{" "}
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-foreground transition-colors hover:text-primary"
            >
              Kunal Choudhary
            </a>{" "}
            🪙
          </span>
          <span>Stellar Testnet · For demo purposes only</span>
        </div>
      </div>
    </footer>
  );
}
