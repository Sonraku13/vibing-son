# Playlist URL Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to paste YouTube or YouTube Music playlist URLs directly into the search bar, auto-resolving the playlist and showing a result row with play and save options, or a clear notification if the playlist is private.

**Architecture:** A standalone URL/ID extractor function parses playlist identifiers from strings or URLs. The background service worker adds a `RESOLVE_PLAYLIST` handler querying YouTube Music's `browse` endpoint (`VL<playlistId>`) for metadata (title, subtitle, thumbnail) with error handling for private/invalid playlists. The popup search handler detects playlist inputs, calls `RESOLVE_PLAYLIST`, and renders the result.

**Tech Stack:** Vanilla JavaScript (ES modules / Web Extension Manifest V3), Node.js for unit test scripts.

**Spec:** `docs/superpowers/specs/2026-11-14-playlist-url-support-design.md`

## Global Constraints

- No API Key: YouTube Music internal `browse` endpoint (`VL<playlistId>`).
- Playlist ID format: `/^[A-Za-z0-9_-]{10,64}$/`.
- Private/unavailable playlist error message: `"Playlist tidak ditemukan atau bersifat privat. Pastikan playlist disetel ke Publik atau Unlisted."`.
- Keep existing styling, font guidelines, and zero new UI elements.

## Review Focus

1. URLs with extra query params (e.g. `?v=xyz&list=PL123&index=2`): parser must cleanly extract `list` param.
2. Shortened / mobile URLs (e.g. `https://youtu.be/...` or `https://m.youtube.com/...`): parser must extract `list` param.
3. Raw playlist IDs typed directly: correctly detected without throwing URL parse errors.
4. Private playlist response (HTTP 200 from YouTube Music but empty contents/header): service worker must return user-friendly error instead of crashing or hanging.
5. Plain text searches that contain "http" or words: must fall through to normal keyword search.

---

### Task 1: URL parser & Playlist ID extractor (`parsePlaylistId`)

**Files:**
- Create: `popup/playlist-url.js`
- Test: `scripts/test-playlist-url.mjs`

**Interfaces:**
- Produces: `parsePlaylistId(input: string) -> string | null`

- [ ] **Step 1: Write the failing test in `scripts/test-playlist-url.mjs`**

```javascript
import assert from "node:assert/strict";
import { parsePlaylistId } from "../popup/playlist-url.js";

assert.equal(parsePlaylistId("https://music.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("https://www.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f&si=abc"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("https://youtu.be/dQw4w9WgXcQ?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("RDCLAK5uy_lRr70m6uTvLpxAG3G6Yuc41cJBIXODAws"), "RDCLAK5uy_lRr70m6uTvLpxAG3G6Yuc41cJBIXODAws");
assert.equal(parsePlaylistId("just a normal search query"), null);
assert.equal(parsePlaylistId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"), null);
console.log("playlist-url tests pass!");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-playlist-url.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `parsePlaylistId` in `popup/playlist-url.js`**

Extract `list` param from URL or test raw string against `/^[A-Za-z0-9_-]{10,64}$/` if it starts with known prefixes (`PL`, `RD`, `OLAK5uy_`, `VL`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-playlist-url.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add popup/playlist-url.js scripts/test-playlist-url.mjs
git commit -m "feat: add playlist url and ID parsing helper"
```

---

### Task 2: Service worker playlist metadata resolver (`RESOLVE_PLAYLIST`)

**Files:**
- Modify: `background/service-worker.js`

**Interfaces:**
- Consumes: `ytmApi("browse", { browseId: 'VL' + playlistId })`
- Produces: Service worker message `RESOLVE_PLAYLIST` returning `{ ok: true, playlist }` or `{ ok: false, error: string }`

- [ ] **Step 1: Write helper `getPlaylistInfoYtm(playlistId)` in `background/service-worker.js`**

```javascript
async function getPlaylistInfoYtm(playlistId) {
  if (!PLAYLIST_ID.test(playlistId || "")) {
    throw new Error("Invalid playlist ID");
  }
  const data = await ytmApi("browse", { browseId: `VL${playlistId}` });
  const header =
    findKey(data, "musicResponsiveHeaderRenderer") ||
    findKey(data, "musicDetailHeaderRenderer") ||
    findKey(data, "musicEditablePlaylistDetailHeaderRenderer");
  const shelf = findKey(data, "musicPlaylistShelfRenderer");

  if (!header && !shelf) {
    throw new Error("Playlist tidak ditemukan atau bersifat privat. Pastikan playlist disetel ke Publik atau Unlisted.");
  }

  const title = header?.title ? runsText(header.title?.runs) : "Playlist";
  const subParts = [runsText(header?.subtitle?.runs), runsText(header?.secondSubtitle?.runs)].filter(Boolean);
  const subtitle = subParts.join(" • ") || (shelf?.contents ? `${shelf.contents.length} songs` : "Playlist");
  const thumbnail = bestThumb(header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails) || "";

  return { playlistId, title, subtitle, thumbnail };
}
```

- [ ] **Step 2: Add `RESOLVE_PLAYLIST` message handler in `background/service-worker.js`**

```javascript
RESOLVE_PLAYLIST: async (msg) => {
  try {
    const playlist = await getPlaylistInfoYtm(msg.playlistId);
    return { ok: true, playlist };
  } catch (err) {
    return {
      ok: false,
      error: err.message || "Playlist tidak ditemukan atau bersifat privat. Pastikan playlist disetel ke Publik atau Unlisted.",
    };
  }
},
```

- [ ] **Step 3: Test via Node runner probe**

Run a script that tests `getPlaylistInfoYtm` logic with both a valid playlist and an invalid/private playlist ID.

- [ ] **Step 4: Commit**

```bash
git add background/service-worker.js
git commit -m "feat: add RESOLVE_PLAYLIST message handler in service worker"
```

---

### Task 3: Integrate URL detection in popup search

**Files:**
- Modify: `popup/popup.html` (include `playlist-url.js` script tag)
- Modify: `popup/popup.js` (`runSearch` integration)

**Interfaces:**
- Consumes: `parsePlaylistId` from `popup/playlist-url.js`, `sw({ type: "RESOLVE_PLAYLIST", playlistId })`

- [ ] **Step 1: Reference `popup/playlist-url.js` in `popup/popup.html`**

Add `<script src="playlist-url.js"></script>` before `popup.js`.

- [ ] **Step 2: Update `runSearch()` in `popup/popup.js` to detect playlist URLs**

When `query` matches `parsePlaylistId(query)`:
1. Show results tab and set searching status.
2. Select the `Playlists` segment button in UI.
3. Call `sw({ type: "RESOLVE_PLAYLIST", playlistId })`.
4. If `res.ok`, render `playlistResultRow(res.playlist)`.
5. If error, render `emptyItem(res.error)`.

- [ ] **Step 3: Update `package.json` test script to include `test-playlist-url.mjs` and run `npm test`**

Ensure `scripts/check.mjs` verifies `playlist-url.js` reference in `popup/popup.html`.
Run: `npm test`
Expected: PASS (lint, check, romanize, playlist-url all pass)

- [ ] **Step 4: Commit**

```bash
git add popup/popup.html popup/popup.js package.json
git commit -m "feat: auto-detect playlist URLs in search bar and display resolved playlist"
```
