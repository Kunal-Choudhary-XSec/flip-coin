"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGameActions } from "@/hooks/use-game-actions";
import { useWallet } from "@/hooks/use-wallet";
import { xlmToStroops, cn } from "@/lib/utils";
import { CoinSide } from "@/types";
import { ENTRY_WINDOW_SECS, RESOLVE_DELAY_SECS } from "@/lib/config";

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState("10");
  const [side, setSide] = useState<CoinSide>(CoinSide.Heads);
  const { connected, connect } = useWallet();
  const { create } = useGameActions();
  const router = useRouter();

  const handleCreate = async () => {
    let stroops: bigint;
    try {
      stroops = xlmToStroops(fee);
      if (stroops <= 0n) throw new Error("empty");
    } catch {
      toast.error("Enter a valid entry fee in XLM (e.g. 10 or 2.5)");
      return;
    }
    try {
      const res = await create.mutateAsync({ entryFeeStroops: stroops, side });
      setOpen(false);
      // create_room returns the new room id — jump straight into the room.
      if (res.returnValue !== null && res.returnValue !== undefined) {
        router.push(`/room/${res.returnValue}`);
      }
    } catch {
      // errors are toasted by useGameActions
    }
  };

  if (!connected) {
    return (
      <Button onClick={connect}>
        <Plus className="h-4 w-4" />
        Create Room
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a coin flip room</DialogTitle>
          <DialogDescription>
            Lock your entry fee and pick a side. Your room waits for an opponent —
            when someone joins, a <strong>{ENTRY_WINDOW_SECS} second</strong> entry
            countdown starts, then the coin flips{" "}
            <strong>{RESOLVE_DELAY_SECS} seconds</strong> later. Winner takes the pot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entry-fee">Entry fee (XLM)</Label>
            <Input
              id="entry-fee"
              type="text"
              inputMode="decimal"
              placeholder="10"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={create.isPending}
            />
            <div className="flex gap-2">
              {["1", "5", "10", "25"].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFee(v)}
                  disabled={create.isPending}
                >
                  {v} XLM
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your side</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [CoinSide.Heads, "Heads", "🪙"],
                  [CoinSide.Tails, "Tails", "🌘"],
                ] as const
              ).map(([value, label, emoji]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  disabled={create.isPending}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-colors",
                    side === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {create.isPending ? "Confirm in wallet…" : `Create room · ${fee || "0"} XLM`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
