import { ChevronRight, ChevronDown, Copy, Link2 } from "lucide-react";
import { NodeView } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 24;
const INDENT_PX = 20;

type Props = {
  node: NodeView;
  depth: number;
  expanded: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onCopyValue: () => void;
  onCopyPath: () => void;
};

export function TreeRow({
  node,
  depth,
  expanded,
  highlighted,
  onToggle,
  onCopyValue,
  onCopyPath,
}: Props) {
  const isContainer = node.kind === "object" || node.kind === "array";

  return (
    <div
      className={cn(
        "group flex items-center font-mono text-[12.5px] leading-none select-none pr-2 relative",
        highlighted && "bg-[color-mix(in_oklch,var(--color-accent)_25%,transparent)]",
        !highlighted && "hover:bg-[var(--color-panel)]"
      )}
      style={{ height: ROW_HEIGHT }}
      onClick={isContainer ? onToggle : undefined}
    >
      {/* indent guides — full-height vertical lines, one per depth level */}
      {Array.from({ length: depth }, (_, i) => (
        <span
          key={i}
          className="shrink-0 self-stretch border-r border-[var(--color-border)]/70"
          style={{ width: INDENT_PX, marginLeft: i === 0 ? 8 : 0 }}
          aria-hidden
        />
      ))}
      <span className="ml-1 flex w-3 shrink-0 items-center justify-center text-[var(--color-muted)]">
        {isContainer ? (
          expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : null}
      </span>
      <div className="flex items-center gap-1 min-w-0 ml-1">
        <KeyLabel node={node} />
        <ValueLabel node={node} />
        {isContainer && (
          <span className="text-[var(--color-muted)] text-[11px]">
            {node.kind === "array" ? `[${node.child_count}]` : `{${node.child_count}}`}
          </span>
        )}
      </div>
      <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <button
          className="p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          title="Copy value"
          onClick={(e) => {
            e.stopPropagation();
            onCopyValue();
          }}
        >
          <Copy size={11} />
        </button>
        <button
          className="p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          title="Copy JSONPath"
          onClick={(e) => {
            e.stopPropagation();
            onCopyPath();
          }}
        >
          <Link2 size={11} />
        </button>
      </div>
    </div>
  );
}

function KeyLabel({ node }: { node: NodeView }) {
  if (node.key.kind === "root") {
    return <span className="text-[var(--color-muted)]">root</span>;
  }
  if (node.key.kind === "object_key") {
    return (
      <>
        <span className="text-[var(--color-key)]">{node.key.key}</span>
        <span className="text-[var(--color-muted)]">:</span>
      </>
    );
  }
  return (
    <>
      <span className="text-[var(--color-muted)]">{node.key.index}</span>
      <span className="text-[var(--color-muted)]">:</span>
    </>
  );
}

function ValueLabel({ node }: { node: NodeView }) {
  if (node.kind === "object" || node.kind === "array") return null;
  const className =
    node.kind === "string"
      ? "text-[var(--color-string)]"
      : node.kind === "number"
        ? "text-[var(--color-number)]"
        : node.kind === "bool"
          ? "text-[var(--color-bool)]"
          : "text-[var(--color-null)]";
  const text =
    node.kind === "string" ? `"${node.preview ?? ""}"` : (node.preview ?? "");
  return <span className={cn("truncate", className)}>{text}</span>;
}

export { ROW_HEIGHT };
