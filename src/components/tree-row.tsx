import { ChevronRight, ChevronDown, Copy, Link2 } from "lucide-react";
import { NodeView } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 24;

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
  const indent = depth * 16;

  return (
    <div
      className={cn(
        "group flex items-center gap-1 px-2 font-mono text-[12.5px] leading-none select-none",
        highlighted && "bg-[color-mix(in_oklch,var(--color-accent)_25%,transparent)]",
        !highlighted && "hover:bg-[var(--color-panel)]"
      )}
      style={{ height: ROW_HEIGHT, paddingLeft: 8 + indent }}
      onClick={isContainer ? onToggle : undefined}
    >
      <span className="w-3 shrink-0 text-[var(--color-muted)]">
        {isContainer ? (
          expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : null}
      </span>
      <KeyLabel node={node} />
      <ValueLabel node={node} />
      {isContainer && (
        <span className="text-[var(--color-muted)] text-[11px]">
          {node.kind === "array" ? `[${node.child_count}]` : `{${node.child_count}}`}
        </span>
      )}
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
