#!/usr/bin/env node
// Sync version from a tag like `v0.1.1` into package.json, tauri.conf.json,
// and Cargo.toml so the built bundle filenames match the release tag.
// Usage: node scripts/sync-version.mjs 0.1.1
import fs from "node:fs";

const raw = process.argv[2];
if (!raw) {
  console.error("usage: sync-version.mjs <version>");
  process.exit(1);
}
const version = raw.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`invalid version: ${raw}`);
  process.exit(1);
}

const bumpJson = (file) => {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  j.version = version;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
};

bumpJson("package.json");
bumpJson("src-tauri/tauri.conf.json");

const cargo = "src-tauri/Cargo.toml";
const txt = fs.readFileSync(cargo, "utf8").replace(
  /^version = ".*"/m,
  `version = "${version}"`,
);
fs.writeFileSync(cargo, txt);

// Keep Cargo.lock's bigJson entry in sync so cargo doesn't refuse builds
// under --locked. Only the package's own entry is touched.
const lock = "src-tauri/Cargo.lock";
const lockTxt = fs.readFileSync(lock, "utf8").replace(
  /(name = "bigJson"\nversion = )".*"/m,
  `$1"${version}"`,
);
fs.writeFileSync(lock, lockTxt);

console.log(`bumped to ${version}`);
