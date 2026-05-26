import { useCallback, useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Toaster, toast } from "sonner";
import { FileJson, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SearchBar } from "@/components/search-bar";
import { StatusBar } from "@/components/status-bar";
import { TreeView } from "@/components/tree-view";
import { useTree } from "@/hooks/use-tree";
import { useSearch } from "@/hooks/use-search";
import { ipc, FileMeta } from "@/lib/tauri";

function App() {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { rows, toggle, reveal, isExpanded } = useTree(meta?.root_id ?? null);
  const search = useSearch(meta != null);

  // When the search cursor changes, expand ancestors and let TreeView scroll.
  useEffect(() => {
    if (search.currentId != null) {
      reveal(search.currentId);
    }
  }, [search.currentId, reveal]);

  const openPath = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const m = await ipc.openFile(path);
      setMeta(m);
      toast.success(`Loaded ${m.node_count.toLocaleString()} nodes in ${m.parse_ms + m.index_ms}ms`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const pickFile = useCallback(async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json", "jsonl", "ndjson", "txt"] }],
    });
    if (typeof selected === "string") {
      await openPath(selected);
    }
  }, [openPath]);

  // Wire drag-drop from the OS into open_file. Tauri 2 surfaces this via
  // webview.onDragDropEvent with phases: enter / over / drop / leave.
  // Guarded so the FE still boots in a plain browser (Tauri runtime absent).
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    const unlistenPromise = getCurrentWebview().onDragDropEvent((evt) => {
      if (evt.payload.type === "over") {
        setDragging(true);
      } else if (evt.payload.type === "leave") {
        setDragging(false);
      } else if (evt.payload.type === "drop") {
        setDragging(false);
        const first = evt.payload.paths?.[0];
        if (first) openPath(first);
      }
    });
    return () => {
      unlistenPromise.then((f) => f());
    };
  }, [openPath]);

  // Keyboard shortcuts: ⌘O open, ⌘F focus search, Esc clear search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        pickFile();
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickFile]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
        <FileJson size={14} className="text-[var(--color-accent)]" />
        <span className="text-[13px] font-medium tracking-tight">bigjson</span>
        <span className="text-[11px] text-[var(--color-muted)]">huge JSON viewer</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={pickFile} disabled={loading} className="gap-1.5">
            <FolderOpen size={12} /> Open
          </Button>
        </div>
      </header>

      {meta && (
        <SearchBar
          query={search.query}
          setQuery={search.setQuery}
          mode={search.mode}
          setMode={search.setMode}
          results={search.results}
          cursor={search.cursor}
          onNext={search.next}
          onPrev={search.prev}
          error={search.error}
          searching={search.searching}
          inputRef={searchRef}
        />
      )}

      <main className="flex-1 min-h-0">
        {meta ? (
          <TreeView
            rows={rows}
            highlightedId={search.currentId}
            isExpanded={isExpanded}
            onToggle={toggle}
          />
        ) : (
          <EmptyState onPick={pickFile} dragging={dragging} />
        )}
      </main>

      <StatusBar meta={meta} visibleCount={rows.length} />
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;
