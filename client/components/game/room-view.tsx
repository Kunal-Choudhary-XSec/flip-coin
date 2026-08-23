"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Loader2, Lock, Swords, Timer, Trophy, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Coin } from "@/components/game/coin";
import { useRoom } from "@/hooks/use-rooms";
import { useCountdown } from "@/hooks/use-countdown";
import { useGameActions } from "@/hooks/use-game-actions";
import { useWallet } from "@/hooks/use-wallet";
import { getRoomUiState, sideLabel } from "@/lib/game";
import { cn, shortAddress, stroopsToXlm } from "@/lib/utils";
import { explorerAccountUrl } from "@/lib/config";
import { CoinSide, type Room, type RoomUiState } from "@/types";

function PlayerCard({
  label,
  address,
  side,
  isYou,
  isWinner,
  showWinner,
}: {
  label: string;
  address: string | null;
  side: CoinSide | null;
  isYou: boolean;
  isWinner: boolean;
  showWinner: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex-1 transition-all",
        showWinner && isWinner && "border-emerald-500/60 bg-emerald-500/5 shadow-lg",
        showWinner && !isWinner && address && "opacity-60",
      )}
    >
      <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          {showWinner && isWinner && <Crown className="h-4 w-4 text-emerald-500" />}
          {label}
        </div>
        {address ? (
          <>
            <a
              href={explorerAccountUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm hover:underline"
            >
              {shortAddress(address, 6)}
            </a>
            <div className="flex items-center gap-2">
              <Coin side={side} size="sm" />
              <span className="text-sm font-semibold">{sideLabel(side)}</span>
            </div>
            {isYou && <Badge variant="outline" className="text-[10px]">you</Badge>}
            {showWinner && (
              <Badge variant={isWinner ? "success" : "secondary"}>
                {isWinner ? "Winner 🎉" : "Lost"}
              </Badge>
            )}
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">Waiting to join…</span>
            <div className="flex items-center gap-2 opacity-40">
              <Coin side={side} size="sm" />
              <span className="text-sm font-semibold">{sideLabel(side)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BigCountdown({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        key={value}
        className="font-mono text-6xl font-bold tabular-nums text-primary animate-in zoom-in-75 duration-300"
      >
        {value}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Timer className="h-4 w-4" />
        {label}
      </span>
    </div>
  );
}

function StatusBadge({ state }: { state: RoomUiState }) {
  switch (state) {
    case "joinable":
      return <Badge variant="success">Waiting for opponent</Badge>;
    case "entry-window":
      return <Badge>Entry window — locking soon</Badge>;
    case "waiting-flip":
      return <Badge variant="secondary">Flipping…</Badge>;
    case "flippable":
      return <Badge>Revealing result</Badge>;
    case "resolved":
      return <Badge variant="secondary">Resolved</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
  }
}

export function RoomView({ roomId }: { roomId: bigint }) {
  const { data: room, isLoading, isError, error, refetch } = useRoom(roomId);
  const { address, connected, connect } = useWallet();
  const { join, resolve, cancel } = useGameActions();

  const state = room ? getRoomUiState(room) : null;
  const entryCountdown = useCountdown(
    room && state === "entry-window" ? room.entryDeadline : null,
  );
  const flipCountdown = useCountdown(
    room && (state === "entry-window" || state === "waiting-flip") ? room.resolveAt : null,
  );

  const isCreator = !!room && address === room.creator;
  const isOpponent = !!room && !!room.opponent && address === room.opponent;
  const isPlayer = isCreator || isOpponent;
  const iWon = !!room && room.winner !== null && room.winner === address;

  // Auto-trigger the reveal transaction once the countdown finishes,
  // so the flip animation flows straight into the result.
  const autoResolveTried = useRef(false);
  useEffect(() => {
    if (
      state === "flippable" &&
      isPlayer &&
      connected &&
      !autoResolveTried.current &&
      !resolve.isPending
    ) {
      autoResolveTried.current = true;
      resolve.mutate({ roomId });
    }
  }, [state, isPlayer, connected, resolve, roomId]);

  // Play the landing animation shortly after the result arrives.
  const sawSpinning = useRef(false);
  if (state === "waiting-flip" || state === "flippable") sawSpinning.current = true;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-xl" />
        <div className="flex gap-4">
          <Skeleton className="h-40 flex-1 rounded-xl" />
          <Skeleton className="h-40 flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !room || !state) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink />
        <ErrorState
          error={error ?? new Error("Room not found")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const opponentSide = (1 - room.creatorSide) as CoinSide;
  const pot = room.entryFee * 2n;
  const spinning = state === "entry-window" || state === "waiting-flip" || state === "flippable" || resolve.isPending;
  const busy = join.isPending || resolve.isPending || cancel.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <BackLink />
        <div className="flex items-center gap-2">
          <span className="font-semibold">Room #{room.id.toString()}</span>
          <StatusBadge state={state} />
        </div>
      </div>

      {/* The stage: coin + phase panel */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <Coin
            side={state === "resolved" ? room.result : null}
            flipping={state !== "resolved" && spinning}
            landing={state === "resolved" && sawSpinning.current}
            size="xl"
          />

          {state === "joinable" && (
            <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Waiting for an opponent. The <strong>10 second</strong> countdown
                starts the moment someone joins — then <strong>5 seconds</strong>{" "}
                to the flip.
              </p>
              {!isCreator && (
                <Button
                  size="lg"
                  className="w-full animate-pulse-ring"
                  disabled={busy}
                  onClick={() =>
                    connected ? join.mutate({ roomId: room.id }) : connect()
                  }
                >
                  {join.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Swords className="h-4 w-4" />
                  )}
                  Join for {stroopsToXlm(room.entryFee)} XLM · {sideLabel(opponentSide)}
                </Button>
              )}
              {isCreator && (
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
              )}
            </div>
          )}

          {state === "entry-window" && (
            <div className="flex flex-col items-center gap-2">
              <BigCountdown value={entryCountdown} label="Entries close — room locks" />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                After this, nobody else can enter. Flip in {flipCountdown}s.
              </p>
            </div>
          )}

          {state === "waiting-flip" && (
            <BigCountdown value={flipCountdown} label="Flipping the coin…" />
          )}

          {state === "flippable" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {resolve.isPending
                  ? "Revealing the result on-chain…"
                  : "Countdown finished — reveal the result!"}
              </p>
              {!resolve.isPending && (
                <Button
                  size="lg"
                  disabled={busy || !connected}
                  onClick={() =>
                    connected ? resolve.mutate({ roomId: room.id }) : connect()
                  }
                >
                  <Trophy className="h-4 w-4" />
                  Reveal result
                </Button>
              )}
            </div>
          )}

          {state === "resolved" && room.result !== null && (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-4xl font-extrabold tracking-tight animate-in zoom-in-50 duration-500">
                {room.result === CoinSide.Heads ? "HEADS!" : "TAILS!"}
              </span>
              <p className="text-sm text-muted-foreground">
                {sideLabel(room.result)} came up — whoever chose{" "}
                <strong>{sideLabel(room.result)}</strong> takes the full pot of{" "}
                <strong>{stroopsToXlm(pot)} XLM</strong>.
              </p>
              {isPlayer && (
                <Badge variant={iWon ? "success" : "secondary"} className="mt-1 px-3 py-1 text-sm">
                  {iWon
                    ? `🎉 You won ${stroopsToXlm(pot)} XLM!`
                    : "You lost this one — flip again!"}
                </Badge>
              )}
            </div>
          )}

          {state === "cancelled" && (
            <p className="text-sm text-muted-foreground">
              This room was cancelled and the creator&apos;s entry fee was refunded.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Players */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <PlayerCard
          label="Creator"
          address={room.creator}
          side={room.creatorSide}
          isYou={isCreator}
          isWinner={room.winner === room.creator}
          showWinner={state === "resolved"}
        />
        <div className="flex items-center justify-center text-sm font-bold text-muted-foreground">
          VS
        </div>
        <PlayerCard
          label="Opponent"
          address={room.opponent}
          side={opponentSide}
          isYou={isOpponent}
          isWinner={room.winner !== null && room.winner === room.opponent}
          showWinner={state === "resolved"}
        />
      </div>

      {/* Pot */}
      <Card>
        <CardContent className="flex items-center justify-between p-4 text-sm">
          <span className="text-muted-foreground">
            Entry fee {stroopsToXlm(room.entryFee)} XLM each
          </span>
          <span className="font-semibold">
            Pot: {stroopsToXlm(pot)} XLM — winner takes all
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/play">
        <ArrowLeft className="h-4 w-4" />
        All rooms
      </Link>
    </Button>
  );
}
