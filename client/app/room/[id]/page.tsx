"use client";

import { useParams } from "next/navigation";
import { RoomView } from "@/components/game/room-view";
import { ErrorState } from "@/components/shared/error-state";

export default function RoomPage() {
  const params = useParams<{ id: string }>();

  let roomId: bigint | null = null;
  try {
    roomId = BigInt(params.id);
  } catch {
    roomId = null;
  }

  if (roomId === null || roomId < 0n) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState error={new Error("Invalid room id")} />
      </div>
    );
  }

  return <RoomView roomId={roomId} />;
}
