/* exported parsePlaylistId */
// PocketBeat - YouTube & YouTube Music playlist URL / ID detection

const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;

function parsePlaylistId(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;

  try {
    const url = new URL(s);
    if (url.searchParams.has("list")) {
      const list = url.searchParams.get("list");
      return list && PLAYLIST_ID_PATTERN.test(list) ? list : null;
    }
    return null;
  } catch {
    // Not a valid URL, check if query string or raw ID
  }

  const listParam = s.match(/[?&]list=([A-Za-z0-9_-]{10,64})(?:[&#\s]|$)/);
  if (listParam && PLAYLIST_ID_PATTERN.test(listParam[1])) {
    return listParam[1];
  }

  // Raw playlist ID with strict YouTube playlist prefixes
  if (/^(?:PL[A-Za-z0-9_-]{16,62}|RD[A-Za-z0-9_-]{11,62}|OLAK5uy_[A-Za-z0-9_-]{33}|VL(?:PL|RD|OLAK5uy_)[A-Za-z0-9_-]{10,60})$/.test(s)) {
    const id = s.startsWith("VL") ? s.slice(2) : s;
    if (PLAYLIST_ID_PATTERN.test(id)) return id;
  }

  return null;
}
