# bigjson

Desktop JSON viewer for huge files. Tauri + Rust + React. macOS for now.

VS Code chokes on 100MB+ JSON because it treats the file as editable text. bigjson skips all of that — parses natively in Rust with `simd-json`, builds a flat index of every node, renders only the rows you can see.

![empty state](docs/screenshots/empty-state.png)

> _Drop a real loaded-tree screenshot here once you've opened a file in the native window._

## What it does

- Open a JSON file (dialog, drag-drop, or ⌘O)
- Virtualized tree millions of nodes scroll instantly, expansion is lazy
- Text search across keys and values
- JSONPath search (`$.users[*].email`)
- Copy node value or JSONPath
- Status bar: size, node count, parse + index time

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

## Run

```bash
npm install
npm run tauri dev          # dev, ~1 min first compile
npm run tauri build        # release .app / .dmg
```

## Test fixtures

```bash
node scripts/gen-fixtures.mjs    # tiny / small / medium JSON in fixtures/
```

## Stack

```
React + Vite + Tailwind 4  ←→  Tauri commands  ←→  Rust (simd-json + flat index)
```

`src/` is the frontend. `src-tauri/src/` is the Rust core (`parser.rs`, `index.rs`, `search.rs`, `commands.rs`).

## Not yet

Files larger than RAM, raw text view, diff, Windows/Linux builds. v2.
