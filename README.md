# bigjson

Desktop JSON viewer for huge files. Tauri + Rust on the backend, React + Vite on the front. macOS for now.

VS Code chokes on 100MB+ JSON because it treats the file as editable text — UTF-16 string in RAM, tokenize, syntax highlight, undo buffer, plugins. By the time you scroll, your fan is on. bigjson skips all of that. It parses the JSON natively in Rust, builds a flat index of every node, and renders only the rows you can see. Open a 100MB JSON in under a second, scroll instantly, search instantly. That's the whole point.

## Why Tauri (and not Electron)

The bottleneck in JS-based viewers is the parser itself. If your shell is Electron, the parse runs in V8 and you're paying that tax no matter how clever your UI is. Tauri lets the parse happen in native Rust via `simd-json` — multiple GB/sec on modern hardware. The webview only sees pre-indexed node metadata, never the raw text. Bundle is ~15MB instead of 100MB+, baseline RAM is tiny.

## What it does today

- Open a JSON file via dialog, drag-drop, or ⌘O
- Native parse with simd-json → flat index of every node (key, kind, child count, preview)
- Virtualized tree — only visible rows render, expansion is lazy
- Text search across keys and values (case-insensitive substring)
- JSONPath search (`$.users[*].email`, `$.users[42].name`, etc.)
- Copy node value (pretty-printed subtree) or copy JSONPath for any node
- Status bar shows file size, node count, parse + index time
- ⌘O open · ⌘F search · Enter / Shift+Enter jump between matches · Esc clear

## What it doesn't do (v2 stuff)

- Files larger than RAM. Right now the whole `serde_json::Value` lives in memory — fine up to a few GB on a 16GB Mac, not fine for 50GB. True mmap-only streaming is v2.
- Raw text view, diff between two files, edit/save — viewer only.
- Windows / Linux builds. Easy to add via GitHub Actions when needed.

## Run it

```bash
npm install
npm run tauri dev
```

First Rust compile takes ~1 min (Tauri pulls in a fair number of crates). After that, dev launches in seconds and HMR works for the React side.

To build a release `.app`/`.dmg`:

```bash
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`.

## Test fixtures

```bash
node scripts/gen-fixtures.mjs
```

Generates `fixtures/tiny.json` (18KB), `small.json` (1.7MB), `medium.json` (17.5MB). Uncomment the bigger ones in the script if you want to stress-test up to 1GB+.

## Architecture

```
React (Vite + TS + Tailwind 4)         ← virtualized tree, search bar, status bar
        │  invoke()  /  events
        ▼
Tauri commands (open_file, get_children, get_value, search, ...)
        │
        ▼
Rust core:
  parser.rs   – simd-json → serde_json::Value
  index.rs    – flat Vec<Node> + child_ids arena, single recursive walk
  search.rs   – text scan over index; serde_json_path for JSONPath
  commands.rs – AppState (RwLock), IPC handlers
```

The `Index` is the trick. It's not a tree of objects — it's a flat `Vec<Node>` plus a contiguous `child_ids` arena. Each `Node` stores its parent, its key (object key or array index), its kind, child count, and a short preview for leaves. Looking up children is a slice into the arena. This keeps memory tight and node-id lookups O(1).

For JSONPath, the matcher walks the live `serde_json::Value` and we map each result's path back to a node id by descending the index in lockstep. No extra path-to-id hashmap.

## Folder layout

```
src/                    React frontend
  components/           tree-view, tree-row, search-bar, status-bar, empty-state, ui/
  hooks/                use-tree (state machine), use-search (debounced)
  lib/                  tauri.ts (typed IPC), format.ts, utils.ts
  styles/globals.css    Tailwind 4 + theme tokens
src-tauri/src/          Rust backend (parser, index, search, commands)
fixtures/               generated JSON test files
scripts/gen-fixtures.mjs
```

## Why this design instead of something fancier

Every "obvious" optimization I skipped on purpose:

- **No byte-offset indexing yet.** Dadroit-style "seek to byte X for node Y" is the eventual story when we stop holding the full Value in RAM. For now, the parsed Value already gives O(1) random access and the index is just a flat mirror of that.
- **No worker threads for parse.** Tauri commands already run off the UI thread. Spawning Rayon for the walk would help on huge arrays but adds complexity that wasn't worth it at MVP.
- **No path → id HashMap.** Saves memory at the cost of an O(depth) walk during JSONPath result mapping. Depth is small in practice.

If profiling later says any of these are wrong, swap them in. Until then they're just churn.
# bigjson
