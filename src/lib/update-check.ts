// Lightweight update check against the GitHub Releases API. Runs once on
// app launch. The official tauri-plugin-updater would also work but needs
// a signed update endpoint — for an unsigned distribution like ours,
// pointing users at the right asset is enough.

import { getVersion } from "@tauri-apps/api/app";

const RELEASES_API = "https://api.github.com/repos/hi-malay/bigjson/releases/latest";

export interface UpdateInfo {
  current: string;
  latest: string;
  // Direct asset URL for the user's platform. Falls back to the release page
  // when no matching asset is published.
  downloadUrl: string;
  // Release page on github — used as a fallback and shown in "view notes" links.
  url: string;
  releaseNotes: string;
}

type GhAsset = { name: string; browser_download_url: string };

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

// Match installed OS against the bundle name patterns tauri produces.
// macOS  → `bigJson_<v>_universal.dmg`
// Windows → `bigJson_<v>_x64-setup.exe`
// Linux   → `bigJson_<v>_amd64.AppImage`
function pickAsset(assets: GhAsset[]): string | null {
  const ua = navigator.userAgent;
  let re: RegExp | null = null;
  if (/Mac|Darwin/i.test(ua)) re = /_universal\.dmg$/i;
  else if (/Windows/i.test(ua)) re = /_x64-setup\.exe$/i;
  else if (/Linux|X11/i.test(ua)) re = /_amd64\.AppImage$/i;
  if (!re) return null;
  return assets.find((a) => re!.test(a.name))?.browser_download_url ?? null;
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
      assets?: GhAsset[];
    };
    const latest = (data.tag_name ?? "").replace(/^v/, "");
    if (!latest || !isNewer(latest, current)) return null;
    const pageUrl =
      data.html_url ?? `https://github.com/hi-malay/bigjson/releases/tag/v${latest}`;
    const direct = pickAsset(data.assets ?? []);
    return {
      current,
      latest,
      downloadUrl: direct ?? pageUrl,
      url: pageUrl,
      releaseNotes: data.body ?? "",
    };
  } catch {
    // offline / rate-limited / etc — silently skip
    return null;
  }
}
