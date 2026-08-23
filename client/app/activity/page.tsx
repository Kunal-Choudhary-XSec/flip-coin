import type { Metadata } from "next";
import { EventFeed } from "@/components/activity/event-feed";

export const metadata: Metadata = {
  title: "Activity — Stellar CoinFlip",
};

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live on-chain events emitted by the CoinFlip contract — room creations,
          joins, flips, and cancellations. Updates automatically.
        </p>
      </div>
      <EventFeed />
    </div>
  );
}
