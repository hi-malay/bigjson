// Lightweight update check against the GitHub Releases API. Runs once on
// app launch. The official tauri-plugin-updater would also work but needs
// a signed update endpoint — for an unsigned distribution like ours,
// pointing users to the release page is enough.

import { getVersion } from "@tauri-apps/api/app";

const RELEASES_API = "https://api.github.com/repos/hi-malay/bigjson/releases/latest";

export interface UpdateInfo {
  current: string;
  latest: string;
  url: string;
  releaseNotes: string;
}

// `current` and `latest` are dotted semver strings. Returns true if `latest`
// is strictly newer. Falls back to string compare for non-numeric pieces.
function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map((p) => parseInt(p, 10));
  const b = current.split(".").map((p) => parseInt(p, 10));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (Number.isNaN(ai) || Number.isNaN(bi)) return latest > current;
    if (ai !== bi) return ai > bi;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  // Skip in plain-browser dev (no Tauri runtime → no version, also CORS).
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return null;
  }
  try {
    const current = await getVersion();
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      html_url?: string;
      body?: string;
    };
    const latest = (data.tag_name ?? "").replace(/^v/, "");
    if (!latest || !isNewer(latest, current)) return null;
    return {
      current,
      latest,
      url: data.html_url ?? `https://github.com/hi-malay/bigjson/releases/tag/v${latest}`,
      releaseNotes: data.body ?? "",
    };
  } catch {
    // offline / rate-limited / etc — silently skip
    return null;
  }
}
