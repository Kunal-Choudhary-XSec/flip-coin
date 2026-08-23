import type { Metadata } from "next";
import { RoomList } from "@/components/game/room-list";
import { ENTRY_WINDOW_SECS, RESOLVE_DELAY_SECS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Play — Stellar CoinFlip",
};

export default function PlayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Game rooms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join an open room or create your own. The countdown starts when an
          opponent joins: {ENTRY_WINDOW_SECS}s entry window, then the coin flips{" "}
          {RESOLVE_DELAY_SECS}s later. Rooms update automatically.
        </p>
      </div>
      <RoomList />
    </div>
  );
}
