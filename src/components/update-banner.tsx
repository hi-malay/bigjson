import { Download, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { UpdateInfo } from "@/lib/update-check";

type Props = {
  update: UpdateInfo;
  onDismiss: () => void;
};

export function UpdateBanner({ update, onDismiss }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-accent)_18%,var(--color-bg))] px-3 py-1.5 text-[12px]">
      <Download size={12} className="text-[var(--color-accent)] shrink-0" />
      <span className="text-[var(--color-fg)]">
        Update available — <strong>{update.latest}</strong>{" "}
        <span className="text-[var(--color-muted)]">(you have {update.current})</span>
      </span>
      <button
        className="ml-2 rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-0.5 hover:border-[var(--color-accent)]"
        onClick={() => {
          openUrl(update.url).catch(() => {});
        }}
      >
        Download
      </button>
      <button
        className="ml-auto p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        onClick={onDismiss}
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
