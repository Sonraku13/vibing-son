/* exported parsePlaylistId */
// PocketBeat - YouTube & YouTube Music playlist URL / ID detection

const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;

function parsePlaylistId(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;

  try {
    const url = new URL(s);
    const list = url.searchParams.get("list");
    if (list && PLAYLIST_ID_PATTERN.test(list)) {
      return list;
    }
  } catch {
    // Not a valid URL, check if query string or raw ID
  }

  const listParam = s.match(/[?&]list=([A-Za-z0-9_-]{10,64})/);
  if (listParam && PLAYLIST_ID_PATTERN.test(listParam[1])) {
    return listParam[1];
  }

  // Raw playlist ID with common YouTube playlist prefixes
  if (/^(?:PL|RD|OLAK5uy_|VL)[A-Za-z0-9_-]{8,60}$/.test(s)) {
    const id = s.startsWith("VL") ? s.slice(2) : s;
    if (PLAYLIST_ID_PATTERN.test(id)) return id;
  }

  return null;
}
