import { FileMeta } from "@/lib/tauri";
import { formatBytes, formatCount, formatDuration } from "@/lib/format";

type Props = {
  meta: FileMeta | null;
  visibleCount: number;
};

export function StatusBar({ meta, visibleCount }: Props) {
  if (!meta) {
    return (
      <div className="h-6 flex items-center gap-3 border-t border-[var(--color-border)] px-3 text-[11px] text-[var(--color-muted)] font-mono">
        <span>no file</span>
      </div>
    );
  }
  const file = meta.path.split("/").pop() ?? meta.path;
  return (
    <div className="h-6 flex items-center gap-3 border-t border-[var(--color-border)] px-3 text-[11px] text-[var(--color-muted)] font-mono">
      <span className="text-[var(--color-fg)] truncate max-w-[40%]" title={meta.path}>{file}</span>
      <Sep />
      <span>{formatBytes(meta.size)}</span>
      <Sep />
      <span>{formatCount(meta.node_count)} nodes</span>
      <Sep />
      <span>parsed {formatDuration(meta.parse_ms)}</span>
      <Sep />
      <span>indexed {formatDuration(meta.index_ms)}</span>
      <span className="ml-auto">{formatCount(visibleCount)} visible</span>
    </div>
  );
}

function Sep() {
  return <span className="text-[var(--color-border)]">·</span>;
}
