# bigjson

Desktop JSON viewer for huge files. Tauri + Rust + React. macOS for now.

VS Code chokes on 100MB+ JSON because it treats the file as editable text. bigjson skips all of that — parses natively in Rust with `simd-json`, builds a flat index of every node, renders only the rows you can see.

![loaded tree](docs/screenshots/loaded-tree.png)

## What it does

- Open a JSON file (dialog, drag-drop, or ⌘O)
- Virtualized tree — millions of nodes scroll instantly, expansion is lazy
- Text search across keys and values
- JSONPath search (`$.users[*].email`)
- Copy node value or JSONPath
- Status bar: size, node count, parse + index time

## Screens

|  |  |
|---|---|
| ![empty](docs/screenshots/empty-state.png) | ![search](docs/screenshots/search.png) |
| _Empty state — drag-drop or ⌘O to open_ | _Text search across keys + values_ |
| ![tree](docs/screenshots/loaded-tree.png) | ![jsonpath](docs/screenshots/jsonpath.png) |
| _Lazy virtualized tree_ | _JSONPath mode_ |

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

`src/` is the frontend. `src-tauri/src/` is the Rust core (`parser.rs`, `index.rs`, `search.rs`, `commands.rs`). The `Index` is a flat `Vec<Node>` plus a `child_ids` arena — node-id lookups are O(1), no per-node heap allocations beyond the previews.

## Not yet

Files larger than RAM, raw text view, diff, Windows/Linux builds. v2.
