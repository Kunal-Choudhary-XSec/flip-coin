"use client";

import { useMemo } from "react";
import { Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RoomCard } from "@/components/game/room-card";
import { CreateRoomDialog } from "@/components/game/create-room-dialog";
import { useRooms } from "@/hooks/use-rooms";
import { useWallet } from "@/hooks/use-wallet";
import { getRoomUiState, isPlayerInRoom } from "@/lib/game";
import type { Room } from "@/types";

function RoomGrid({ rooms, emptyLabel }: { rooms: Room[]; emptyLabel: string }) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={Coins}
        title={emptyLabel}
        description="Create a room and challenge someone to a flip."
        action={<CreateRoomDialog />}
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard key={room.id.toString()} room={room} />
      ))}
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}

export function RoomList() {
  const { data: rooms, isLoading, isError, error, refetch } = useRooms();
  const { address } = useWallet();

  const { active, mine, finished } = useMemo(() => {
    const all = rooms ?? [];
    return {
      active: all.filter((r) =>
        ["joinable", "entry-window", "waiting-flip", "flippable"].includes(
          getRoomUiState(r),
        ),
      ),
      mine: all.filter((r) => isPlayerInRoom(r, address)),
      finished: all.filter((r) =>
        ["resolved", "cancelled"].includes(getRoomUiState(r)),
      ),
    };
  }, [rooms, address]);

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <Tabs defaultValue="active">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="mine">My games ({mine.length})</TabsTrigger>
          <TabsTrigger value="finished">Finished ({finished.length})</TabsTrigger>
        </TabsList>
        <CreateRoomDialog />
      </div>

      <TabsContent value="active" className="mt-4">
        {isLoading ? <RoomsSkeleton /> : <RoomGrid rooms={active} emptyLabel="No active rooms" />}
      </TabsContent>
      <TabsContent value="mine" className="mt-4">
        {isLoading ? <RoomsSkeleton /> : <RoomGrid rooms={mine} emptyLabel="You haven't played yet" />}
      </TabsContent>
      <TabsContent value="finished" className="mt-4">
        {isLoading ? (
          <RoomsSkeleton />
        ) : (
          <RoomGrid rooms={finished} emptyLabel="No finished games yet" />
        )}
      </TabsContent>
    </Tabs>
  );
}
