import { ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SearchMode } from "@/lib/tauri";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  setQuery: (q: string) => void;
  mode: SearchMode;
  setMode: (m: SearchMode) => void;
  results: number[];
  cursor: number;
  onNext: () => void;
  onPrev: () => void;
  error: string | null;
  searching: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function SearchBar({
  query,
  setQuery,
  mode,
  setMode,
  results,
  cursor,
  onNext,
  onPrev,
  error,
  searching,
  inputRef,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
      <Search size={13} className="text-[var(--color-muted)]" />
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={query}
          placeholder={mode === "text" ? "Search keys / values" : "$.users[*].email"}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) onPrev();
              else onNext();
            } else if (e.key === "Escape") {
              setQuery("");
            }
          }}
          className={cn(
            "pr-7 font-mono",
            error && "border-red-500/60"
          )}
        />
        {query && (
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            onClick={() => setQuery("")}
            tabIndex={-1}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center rounded-md border border-[var(--color-border)] overflow-hidden text-[11px]">
        <button
          className={cn(
            "px-2 py-1",
            mode === "text"
              ? "bg-[var(--color-panel)] text-[var(--color-fg)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          )}
          onClick={() => setMode("text")}
        >
          Text
        </button>
        <button
          className={cn(
            "px-2 py-1 border-l border-[var(--color-border)]",
            mode === "jsonpath"
              ? "bg-[var(--color-panel)] text-[var(--color-fg)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          )}
          onClick={() => setMode("jsonpath")}
        >
          JSONPath
        </button>
      </div>
      <div className="flex items-center gap-1 min-w-[90px] justify-end">
        <span className="text-[11px] text-[var(--color-muted)] tabular-nums">
          {searching
            ? "…"
            : error
              ? "err"
              : results.length === 0
                ? query
                  ? "0"
                  : ""
                : `${cursor + 1}/${results.length}`}
        </span>
        <Button size="icon" variant="ghost" onClick={onPrev} disabled={results.length === 0} title="Previous (Shift+Enter)">
          <ChevronUp size={13} />
        </Button>
        <Button size="icon" variant="ghost" onClick={onNext} disabled={results.length === 0} title="Next (Enter)">
          <ChevronDown size={13} />
        </Button>
      </div>
    </div>
  );
}
