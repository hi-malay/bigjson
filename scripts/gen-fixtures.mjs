// Generate test JSON fixtures of various sizes.
// Usage: node scripts/gen-fixtures.mjs

import { mkdirSync, createWriteStream, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "fixtures");
mkdirSync(outDir, { recursive: true });

const FIRST = ["alex", "sam", "jordan", "casey", "riley", "max", "drew", "morgan", "taylor", "quinn"];
const LAST = ["lee", "ng", "patel", "wong", "khan", "shah", "rao", "smith", "park", "chen"];
const TAGS = ["alpha", "beta", "gamma", "delta", "x", "y", "z", "prime", "lite", "pro"];

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function pick(arr, r) {
  return arr[Math.floor(r() * arr.length)];
}

function user(i, r) {
  return {
    id: i,
    name: `${pick(FIRST, r)} ${pick(LAST, r)}`,
    email: `user${i}@example.com`,
    age: 18 + Math.floor(r() * 60),
    active: r() > 0.3,
    tags: Array.from({ length: 1 + Math.floor(r() * 4) }, () => pick(TAGS, r)),
    address: {
      street: `${Math.floor(r() * 9999)} ${pick(["Main", "Oak", "Pine", "Elm"], r)} St`,
      city: pick(["Bengaluru", "Mumbai", "Delhi", "Pune", "Toronto", "Berlin"], r),
      zip: Math.floor(r() * 100000).toString().padStart(5, "0"),
    },
    scores: Array.from({ length: 5 }, () => +(r() * 100).toFixed(2)),
    bio: r() > 0.5
      ? "Software engineer interested in distributed systems and developer tools."
      : null,
  };
}

async function writeUsers(file, count, seed) {
  const r = rand(seed);
  const out = createWriteStream(file);
  out.write('{\n  "version": 1,\n  "generated_at": "' + new Date().toISOString() + '",\n  "users": [\n');
  for (let i = 0; i < count; i++) {
    out.write(JSON.stringify(user(i, r), null, 2));
    if (i < count - 1) out.write(",\n");
    if (i % 1000 === 0 && i > 0) await new Promise((res) => out.write("", res));
  }
  out.write("\n  ],\n");
  out.write('  "meta": { "count": ' + count + ', "schema": "v1" }\n}\n');
  out.end();
  await new Promise((res) => out.on("close", res));
  const size = statSync(file).size;
  console.log(`${file}: ${count} users, ${(size / 1024 / 1024).toFixed(1)} MB`);
}

await writeUsers(`${outDir}/tiny.json`, 50, 1);
await writeUsers(`${outDir}/small.json`, 5000, 2);
await writeUsers(`${outDir}/medium.json`, 50_000, 3);
// Skip the big ones by default — uncomment when stress-testing.
// await writeUsers(`${outDir}/large.json`, 500_000, 4);
// await writeUsers(`${outDir}/huge.json`, 2_000_000, 5);
