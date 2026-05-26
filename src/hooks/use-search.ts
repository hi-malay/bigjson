import { useCallback, useEffect, useRef, useState } from "react";
import { ipc, SearchMode } from "@/lib/tauri";

const DEBOUNCE_MS = 180;

export function useSearch(enabled: boolean) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("text");
  const [results, setResults] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled || query.trim() === "") {
      setResults([]);
      setCursor(0);
      setError(null);
      return;
    }
    const mySeq = ++seqRef.current;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const r = await ipc.search(query, mode);
        if (seqRef.current !== mySeq) return;
        setResults(r);
        setCursor(0);
        setError(null);
      } catch (e) {
        if (seqRef.current !== mySeq) return;
        setResults([]);
        setError(String(e));
      } finally {
        if (seqRef.current === mySeq) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, mode, enabled]);

  const next = useCallback(() => {
    if (results.length === 0) return;
    setCursor((c) => (c + 1) % results.length);
  }, [results.length]);

  const prev = useCallback(() => {
    if (results.length === 0) return;
    setCursor((c) => (c - 1 + results.length) % results.length);
  }, [results.length]);

  const currentId = results.length > 0 ? results[cursor] : null;

  return { query, setQuery, mode, setMode, results, cursor, currentId, next, prev, error, searching };
}
