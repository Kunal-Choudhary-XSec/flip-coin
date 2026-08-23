"use client";

import { Activity, ExternalLink, PartyPopper, Swords, Undo2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useGameEvents } from "@/hooks/use-events";
import { sideLabel } from "@/lib/game";
import { explorerAccountUrl, explorerTxUrl } from "@/lib/config";
import { shortAddress, stroopsToXlm, formatDateTime, timeAgo } from "@/lib/utils";
import type { GameEvent } from "@/types";

const EVENT_META = {
  created: {
    icon: Swords,
    label: "Room created",
    badge: "default" as const,
    describe: (e: GameEvent) =>
      `created room #${e.roomId} · ${e.amount !== null ? stroopsToXlm(e.amount) : "?"} XLM entry`,
  },
  joined: {
    icon: UserPlus,
    label: "Player joined",
    badge: "secondary" as const,
    describe: (e: GameEvent) =>
      `joined room #${e.roomId} · matched ${e.amount !== null ? stroopsToXlm(e.amount) : "?"} XLM`,
  },
  resolved: {
    icon: PartyPopper,
    label: "Coin flipped",
    badge: "success" as const,
    describe: (e: GameEvent) =>
      `won room #${e.roomId} · ${sideLabel(e.result)} · pot ${e.amount !== null ? stroopsToXlm(e.amount) : "?"} XLM`,
  },
  cancelled: {
    icon: Undo2,
    label: "Room cancelled",
    badge: "outline" as const,
    describe: (e: GameEvent) =>
      `cancelled room #${e.roomId} · ${e.amount !== null ? stroopsToXlm(e.amount) : "?"} XLM refunded`,
  },
};

function EventRow({ event }: { event: GameEvent }) {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;

  return (
    <li className="glass flex items-start gap-3 rounded-2xl p-3.5">
      <div className="glass-subtle mt-0.5 rounded-full p-2">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={meta.badge}>{meta.label}</Badge>
          <span className="text-xs text-muted-foreground" title={formatDateTime(event.timestamp)}>
            {timeAgo(event.timestamp)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm">
          <a
            href={explorerAccountUrl(event.address)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs hover:underline"
          >
            {shortAddress(event.address, 6)}
          </a>{" "}
          <span className="text-muted-foreground">{meta.describe(event)}</span>
        </p>
      </div>
      <a
        href={explorerTxUrl(event.txHash)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 text-muted-foreground hover:text-foreground"
        title="View transaction on explorer"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </li>
  );
}

export function EventFeed({ limit }: { limit?: number }) {
  const { data: events, isLoading, isError, error, refetch } = useGameEvents();

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const list = limit ? (events ?? []).slice(0, limit) : (events ?? []);

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Contract events will show up here in real time as rooms are created, joined, and flipped."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}
