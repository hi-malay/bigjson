# bigjson

Desktop JSON viewer for huge files. Tauri + Rust + React. macOS for now.

VS Code chokes on 100MB+ JSON because it treats the file as editable text. bigjson skips all of that — parses natively in Rust with `simd-json`, builds a flat index of every node, renders only the rows you can see.

![empty state](docs/screenshots/empty-state.png)

> _Drop a real loaded-tree screenshot here once you've opened a file in the native window._

## What it does

- Open a JSON file (dialog, drag-drop, or ⌘O)
- Virtualized tree — millions of nodes scroll instantly, expansion is lazy
- Text search across keys and values
- JSONPath search (`$.users[*].email`)
- Copy node value or JSONPath
- Status bar: size, node count, parse + index time

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
