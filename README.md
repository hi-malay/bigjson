## [DOWNLOAD](https://github.com/hi-malay/bigjson/releases)

# bigjson

Desktop JSON viewer for huge files. Tauri + Rust + React. Runs on macOS, Linux, and Windows.

VS Code chokes on 100MB+ JSON because it treats the file as editable text. bigjson skips all of that — parses natively in Rust with `simd-json`, builds a flat index of every node, renders only the rows you can see.

![loaded tree](docs/screenshots/loaded-tree.png)

## Download

Latest release: [github.com/hi-malay/bigjson/releases/latest](https://github.com/hi-malay/bigjson/releases/latest)

- **macOS** (Intel + Apple Silicon, universal): [bigjson_0.1.0_universal.dmg](https://github.com/hi-malay/bigjson/releases/latest/download/bigjson_0.1.0_universal.dmg)
- **Windows** (x64): [bigjson_0.1.0_x64-setup.exe](https://github.com/hi-malay/bigjson/releases/latest/download/bigjson_0.1.0_x64-setup.exe)
- **Linux AppImage** (x64): [bigjson_0.1.0_amd64.AppImage](https://github.com/hi-malay/bigjson/releases/latest/download/bigjson_0.1.0_amd64.AppImage)
- **Linux .deb** (Debian/Ubuntu): [bigjson_0.1.0_amd64.deb](https://github.com/hi-malay/bigjson/releases/latest/download/bigjson_0.1.0_amd64.deb)

All builds are **unsigned**. First-launch workarounds:
- macOS: right-click → Open, or run `xattr -cr /Applications/bigjson.app`
- Windows: SmartScreen blocks it → click "More info" → "Run anyway"
- Linux AppImage: `chmod +x bigjson_*.AppImage && ./bigjson_*.AppImage`

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

Files larger than RAM, raw text view, diff editor, code-signing/notarization. v2.
