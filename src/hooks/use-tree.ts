import { useCallback, useEffect, useRef, useState } from "react";
import { ipc, NodeView } from "@/lib/tauri";

export type Row = {
  node: NodeView;
  depth: number;
  // for arrays/objects with `chunk > 0`, this row sits at `chunk*PAGE_SIZE`
  // and acts as a "load more" trigger when expanded beyond the first page.
};

const PAGE_SIZE = 500;

type ExpandedMap = Map<number, boolean>; // node id -> true if expanded
type ChildrenCache = Map<number, NodeView[]>; // node id -> loaded children (paginated, concat'd)

/**
 * Tree state machine: keeps the expanded-set, lazily fetches children, and
 * derives a flat `rows` array suitable for @tanstack/react-virtual.
 *
 * Root is always present once loaded. Expanding a node fetches its first page
 * of children if not already cached. Arrays with > PAGE_SIZE children fetch
 * additional pages on demand (see `loadMore`).
 */
export function useTree(rootId: number | null) {
  const [rows, setRows] = useState<Row[]>([]);
  const expandedRef = useRef<ExpandedMap>(new Map());
  const cacheRef = useRef<ChildrenCache>(new Map());
  const [, forceTick] = useState(0);
  const tick = useCallback(() => forceTick((t) => t + 1), []);

  // Rebuild flat row list from the expanded set + cached children.
  const rebuild = useCallback(async () => {
    if (rootId == null) {
      setRows([]);
      return;
    }
    const rootNode = await ipc.getNode(rootId);
    const out: Row[] = [{ node: rootNode, depth: 0 }];

    const walk = async (parentId: number, depth: number) => {
      if (!expandedRef.current.get(parentId)) return;
      const kids = cacheRef.current.get(parentId);
      if (!kids) return;
      for (const k of kids) {
        out.push({ node: k, depth });
        if (expandedRef.current.get(k.id)) {
          await walk(k.id, depth + 1);
        }
      }
    };
    await walk(rootId, 1);
    setRows(out);
  }, [rootId]);

  useEffect(() => {
    if (rootId == null) {
      expandedRef.current.clear();
      cacheRef.current.clear();
      setRows([]);
      return;
    }
    // auto-expand root on first load
    expandedRef.current.set(rootId, true);
    (async () => {
      const kids = await ipc.getChildren(rootId, 0, PAGE_SIZE);
      cacheRef.current.set(rootId, kids);
      await rebuild();
    })();
  }, [rootId, rebuild]);

  const toggle = useCallback(
    async (id: number) => {
      const isOpen = expandedRef.current.get(id) === true;
      if (isOpen) {
        expandedRef.current.set(id, false);
      } else {
        expandedRef.current.set(id, true);
        if (!cacheRef.current.has(id)) {
          const kids = await ipc.getChildren(id, 0, PAGE_SIZE);
          cacheRef.current.set(id, kids);
        }
      }
      await rebuild();
    },
    [rebuild]
  );

  // Expand all ancestors of `id` and ensure it's visible (used when search jumps).
  const reveal = useCallback(
    async (id: number) => {
      const ancestors = await ipc.getAncestors(id);
      for (const a of ancestors) {
        if (!expandedRef.current.get(a)) {
          expandedRef.current.set(a, true);
          if (!cacheRef.current.has(a)) {
            const kids = await ipc.getChildren(a, 0, PAGE_SIZE);
            cacheRef.current.set(a, kids);
          }
        }
      }
      await rebuild();
    },
    [rebuild]
  );

  const isExpanded = useCallback((id: number) => expandedRef.current.get(id) === true, []);

  const loadedChildCount = useCallback(
    (id: number) => cacheRef.current.get(id)?.length ?? 0,
    []
  );

  const loadMore = useCallback(
    async (id: number) => {
      const have = cacheRef.current.get(id)?.length ?? 0;
      const more = await ipc.getChildren(id, have, PAGE_SIZE);
      if (more.length === 0) return;
      cacheRef.current.set(id, [...(cacheRef.current.get(id) ?? []), ...more]);
      await rebuild();
      tick();
    },
    [rebuild, tick]
  );

  return { rows, toggle, reveal, isExpanded, loadedChildCount, loadMore };
}

export { PAGE_SIZE };
