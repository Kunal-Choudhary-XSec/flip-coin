"use client";

import Link from "next/link";
import { ArrowRight, Coins, ShieldCheck, Timer, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coin } from "@/components/game/coin";
import { EventFeed } from "@/components/activity/event-feed";
import { useWallet } from "@/hooks/use-wallet";
import { ENTRY_WINDOW_SECS, RESOLVE_DELAY_SECS } from "@/lib/config";
import { CoinSide } from "@/types";

const STEPS = [
  {
    icon: Coins,
    title: "Create a room",
    description:
      "Pick heads or tails and lock your entry fee. The room waits for an opponent — no countdown yet.",
  },
  {
    icon: Timer,
    title: `Opponent joins → ${ENTRY_WINDOW_SECS}s countdown`,
    description:
      "The moment someone matches your fee, the 10 second entry countdown starts.",
  },
  {
    icon: Zap,
    title: `${RESOLVE_DELAY_SECS}s to the flip`,
    description:
      "Then 5 more seconds and the coin is flipped on-chain using protocol randomness.",
  },
  {
    icon: Trophy,
    title: "Winner takes all",
    description: "The smart contract instantly pays the whole pot to the winner.",
  },
];

export default function HomePage() {
  const { connected, connect } = useWallet();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pt-8 text-center">
        <Coin side={CoinSide.Heads} flipping size="lg" />
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            P2P Coin Flips on <span className="text-primary">Stellar</span>
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Challenge anyone to a provably on-chain coin flip. Entry fees are
            escrowed by a Soroban smart contract — winner takes the whole pot.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/play">
              Start playing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {!connected && (
            <Button size="lg" variant="outline" onClick={connect}>
              Connect wallet
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Funds held by the contract, not by us · Stellar Testnet
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <CardTitle className="pt-2 text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {step.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Live activity preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Live activity</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/activity">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <EventFeed limit={5} />
      </section>
    </div>
  );
}
