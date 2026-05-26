import { FileJson, Upload } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
  onPick: () => void;
  dragging: boolean;
};

export function EmptyState({ onPick, dragging }: Props) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 text-center text-[var(--color-muted)]"
      style={{
        background: dragging
          ? "color-mix(in oklch, var(--color-accent) 8%, transparent)"
          : "transparent",
      }}
    >
      <FileJson size={48} className="opacity-50" />
      <div className="space-y-1">
        <div className="text-[var(--color-fg)] text-sm">
          {dragging ? "Drop the JSON file" : "Open a JSON file to begin"}
        </div>
        <div className="text-[11px]">drag & drop · or use the button below · ⌘O</div>
      </div>
      <Button onClick={onPick} variant="default" size="md" className="gap-2">
        <Upload size={13} /> Open file
      </Button>
    </div>
  );
}
