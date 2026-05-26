import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { ipc } from "@/lib/tauri";
import { TreeRow, ROW_HEIGHT } from "./tree-row";
import { Row } from "@/hooks/use-tree";

type Props = {
  rows: Row[];
  highlightedId: number | null;
  isExpanded: (id: number) => boolean;
  onToggle: (id: number) => void;
};

export function TreeView({ rows, highlightedId, isExpanded, onToggle }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
    getItemKey: (i) => rows[i].node.id,
  });

  // Auto-scroll to highlighted row when search lands on a node.
  const lastHighlight = useRef<number | null>(null);
  useEffect(() => {
    if (highlightedId == null || highlightedId === lastHighlight.current) return;
    const idx = rows.findIndex((r) => r.node.id === highlightedId);
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "center" });
      lastHighlight.current = highlightedId;
    }
  }, [highlightedId, rows, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  const copyValue = useMemo(
    () => async (id: number) => {
      const v = await ipc.getValue(id);
      await navigator.clipboard.writeText(v);
      toast.success("Value copied");
    },
    []
  );
  const copyPath = useMemo(
    () => async (id: number) => {
      const p = await ipc.getPath(id);
      await navigator.clipboard.writeText(p);
      toast.success(`Path copied: ${p}`);
    },
    []
  );

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.map((vi) => {
          const row = rows[vi.index];
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <TreeRow
                node={row.node}
                depth={row.depth}
                expanded={isExpanded(row.node.id)}
                highlighted={row.node.id === highlightedId}
                onToggle={() => onToggle(row.node.id)}
                onCopyValue={() => copyValue(row.node.id)}
                onCopyPath={() => copyPath(row.node.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
