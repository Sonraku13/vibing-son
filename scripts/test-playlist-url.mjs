import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const ctx = { console, URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "popup", "playlist-url.js"), "utf8"), ctx);
const { parsePlaylistId } = ctx;

assert.equal(parsePlaylistId("https://music.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("https://www.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f&si=abc"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("https://youtu.be/dQw4w9WgXcQ?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("RDCLAK5uy_lRr70m6uTvLpxAG3G6Yuc41cJBIXODAws"), "RDCLAK5uy_lRr70m6uTvLpxAG3G6Yuc41cJBIXODAws");
assert.equal(parsePlaylistId("just a normal search query"), null);
assert.equal(parsePlaylistId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"), null);

// Edge cases from review:
assert.equal(parsePlaylistId("https://music.youtube.com/playlist?list=" + "A".repeat(70)), null);
assert.equal(parsePlaylistId("https://music.youtube.com/playlist?list=PL123$invalid"), null);
assert.equal(parsePlaylistId("PLAYSTATION5"), null);
assert.equal(parsePlaylistId("PLATFORMING"), null);
assert.equal(parsePlaylistId("RDLIFEMUSIC"), null);
assert.equal(parsePlaylistId("https://m.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f&index=2"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");
assert.equal(parsePlaylistId("VLPL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f"), "PL4fGSI1pDJn6O1LS0XSdF3RyO0KQ_EO-f");

console.log("playlist-url tests pass!");
