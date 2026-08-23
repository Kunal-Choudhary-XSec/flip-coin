"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Swords, Timer, Trophy, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Coin } from "@/components/game/coin";
import { useCountdown } from "@/hooks/use-countdown";
import { useGameActions } from "@/hooks/use-game-actions";
import { useWallet } from "@/hooks/use-wallet";
import { getRoomUiState, sideLabel } from "@/lib/game";
import { shortAddress, stroopsToXlm, timeAgo } from "@/lib/utils";
import { explorerAccountUrl } from "@/lib/config";
import type { Room } from "@/types";

function StatusBadge({ room }: { room: Room }) {
  const state = getRoomUiState(room);
  switch (state) {
    case "joinable":
      return <Badge variant="success">Waiting for opponent</Badge>;
    case "entry-window":
      return <Badge>Entry window</Badge>;
    case "waiting-flip":
      return <Badge variant="secondary">Flipping soon</Badge>;
    case "flippable":
      return <Badge>Ready to flip</Badge>;
    case "resolved":
      return <Badge variant="secondary">Resolved</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
  }
}

export function RoomCard({ room }: { room: Room }) {
  const { address, connected, connect } = useWallet();
  const { join, resolve, cancel } = useGameActions();
  const router = useRouter();

  const enterRoom = () => router.push(`/room/${room.id}`);

  const handleJoin = async () => {
    if (!connected) {
      connect();
      return;
    }
    try {
      await join.mutateAsync({ roomId: room.id });
      // Jump into the room where the countdown + flip animations play out.
      enterRoom();
    } catch {
      // errors are toasted by useGameActions
    }
  };

  const state = getRoomUiState(room);
  // Countdowns only exist once an opponent has joined.
  const entryCountdown = useCountdown(state === "entry-window" ? room.entryDeadline : null);
  const flipCountdown = useCountdown(
    state === "waiting-flip" || state === "flippable" ? room.resolveAt : null,
  );

  const isCreator = address === room.creator;
  const isOpponent = address === room.opponent;
  const isPlayer = isCreator || isOpponent;
  const iWon = room.winner !== null && room.winner === address;

  const busy = join.isPending || resolve.isPending || cancel.isPending;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/room/${room.id}`}
            className="text-sm font-semibold hover:underline"
          >
            Room #{room.id.toString()}
          </Link>
          <StatusBadge room={room} />
        </div>
        <span className="text-xs text-muted-foreground">
          {timeAgo(room.createdAt * 1000)}
        </span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-1 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Creator</span>
              <a
                href={explorerAccountUrl(room.creator)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs hover:underline"
              >
                {shortAddress(room.creator)}
              </a>
              {isCreator && <Badge variant="outline" className="text-[10px]">you</Badge>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Bet on</span>
              <span className="font-medium">{sideLabel(room.creatorSide)}</span>
            </div>
            {room.opponent && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Opponent</span>
                <a
                  href={explorerAccountUrl(room.opponent)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs hover:underline"
                >
                  {shortAddress(room.opponent)}
                </a>
                {isOpponent && <Badge variant="outline" className="text-[10px]">you</Badge>}
              </div>
            )}
          </div>
          <Coin
            side={room.result}
            flipping={state === "entry-window" || state === "waiting-flip"}
            size="sm"
            className="shrink-0"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Entry fee</span>
          <span className="font-semibold">{stroopsToXlm(room.entryFee)} XLM</span>
        </div>

        {state === "resolved" && room.winner && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <span>
              <span className="font-medium">{sideLabel(room.result)}</span> —{" "}
              {iWon ? (
                <span className="font-semibold text-emerald-500">
                  you won {stroopsToXlm(room.entryFee * 2n)} XLM!
                </span>
              ) : (
                <>
                  <span className="font-mono text-xs">{shortAddress(room.winner)}</span>{" "}
                  won {stroopsToXlm(room.entryFee * 2n)} XLM
                </>
              )}
            </span>
          </div>
        )}

        <div className="mt-auto">
          {state === "joinable" && (
            <div className="space-y-2">
              {!isCreator && (
                <>
                  <p className="text-center text-xs text-muted-foreground">
                    No countdown yet — it starts the moment you join.
                  </p>
                  <Button
                    className="w-full animate-pulse-ring"
                    disabled={busy}
                    onClick={handleJoin}
                  >
                    {join.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Swords className="h-4 w-4" />
                    )}
                    Join · {stroopsToXlm(room.entryFee)} XLM · {sideLabel(1 - room.creatorSide)}
                  </Button>
                </>
              )}
              {isCreator && (
                <div className="space-y-2">
                  <p className="text-center text-xs text-muted-foreground">
                    Waiting for an opponent — the countdown starts when someone joins.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => cancel.mutate({ roomId: room.id })}
                  >
                    {cancel.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Undo2 className="h-4 w-4" />
                    )}
                    Cancel & refund
                  </Button>
                </div>
              )}
            </div>
          )}

          {state === "entry-window" && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                Entries locked in{" "}
                <span className="font-mono font-semibold text-foreground">
                  {entryCountdown}s
                </span>
              </div>
              <Button variant="secondary" className="w-full" onClick={enterRoom}>
                Watch live
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {state === "waiting-flip" && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                Coin flips in{" "}
                <span className="font-mono font-semibold text-foreground">
                  {flipCountdown}s
                </span>
              </div>
              <Button variant="secondary" className="w-full" onClick={enterRoom}>
                Watch the flip
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {state === "flippable" && (
            <Button className="w-full" disabled={busy} onClick={enterRoom}>
              <Trophy className="h-4 w-4" />
              Reveal in room
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {state === "resolved" && (
            <Button variant="ghost" size="sm" className="w-full" onClick={enterRoom}>
              View result
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
