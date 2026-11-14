# Design: YouTube Music Playlist URL Detection in Search Bar

## Intent & The Why
Pengguna ingin menambahkan atau memutar playlist YouTube / YouTube Music langsung dengan menempelkan (paste) link URL playlist ke PocketBeat, tanpa harus mencari kata kunci manual atau mengantre lagu satu per satu.

## Goals
- Mendeteksi input URL playlist (baik `music.youtube.com`, `youtube.com`, maupun link video dengan parameter `&list=`) saat diketik/ditempelkan ke search bar PocketBeat.
- Mengekstrak `playlistId` dan mengambil info playlist (judul, thumbnail, jumlah lagu) dari YouTube Music `browse` API.
- Menampilkan kartu playlist di tab Results secara otomatis dengan tombol Play (langsung putar) dan Add/Save (simpan ke Playlists lokal).
- Jika pengguna menekan Enter pada URL playlist, otomatis beralih ke tab Results dengan mode playlist terpilih.

## Non-Goals & Anti-Goals
- Tidak membuat form input terpisah atau modal baru (menjaga UI tetap ringkas dan minimalis).
- Tidak mem-bypass batasan `MAX_PLAYLIST_TRACKS` (tetap batas maksimal 200 lagu per playlist lokal).
- Tidak mengubah format penyimpanan data playlist yang sudah ada di `chrome.storage.local`.

## Constraints & Playlist Visibility
- No API Key: Memanfaatkan endpoint internal YouTube Music `browse` (`VL<playlistId>`) yang sudah ada di extension.
- Validasi playlist ID menggunakan regex standar `^[A-Za-z0-9_-]{10,64}$`.
- **Visibilitas Playlist**:
  - Playlist **Publik** atau **Unlisted** (tidak publik tapi punya link langsung) dapat diakses tanpa login.
  - Playlist **Private** membutuhkan cookie login akun pemilik dan tidak dapat diakses secara anonim oleh PocketBeat.
  - **Error Handling**: Jika playlist private, tidak ditemukan, atau tidak memiliki lagu yang dapat diputar, tampilkan pesan error yang jelas dan ramah:
    `"Playlist tidak ditemukan atau bersifat privat. Pastikan playlist disetel ke Publik atau Unlisted."`

## Approaches Considered
1. **Auto-detect di Search Bar (Dipilih)**:
   - Pengguna menempelkan URL di search bar utama.
   - Extension mendeteksi parameter `list=` atau bentuk URL, lalu langsung fetch metadata playlist sebagai hasil tunggal di Results tab.
   - *Kelebihan*: Zero-clutter, konsisten dengan alur UX pencarian saat ini, tidak menambah elemen UI baru.
2. **Form Input Terpisah di Tab Playlists**:
   - Menambahkan input URL dan tombol "Add from URL" di tab Playlists.
   - *Kekurangan*: Menambah kepadatan tampilan pada popup yang sempit (360px), memerlukan validasi form ekstra.

## How It Works
1. **URL & Playlist ID Extraction (`popup.js` / helper)**:
   - Fungsi parser mengekstrak parameter `list` dari URL YouTube (`https://.../playlist?list=...` atau `https://.../watch?v=...&list=...`) atau string ID jika user mengetik raw ID playlist.
2. **Backend Service Worker (`service-worker.js`)**:
   - Menambahkan handler atau memanfaatkan `GET_PLAYLIST_METADATA` / `RESOLVE_PLAYLIST` via `ytmApi("browse", { browseId: "VL" + playlistId })`.
   - Mengambil judul dari `musicResponsiveHeaderRenderer` / `musicDetailHeaderRenderer`, thumbnail, dan jumlah lagu/subtitle.
3. **Results Rendering**:
   - Jika query adalah URL playlist, hasil pencarian langsung menampilkan kartu playlist tersebut via `playlistResultRow(...)`.
