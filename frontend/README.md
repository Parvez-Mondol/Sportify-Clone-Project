# Sportify Frontend

React web app for Sportify, a Spotify-style music player. Built with **React 19, React Router and Vite**; styling is plain CSS (`src/styles.css`).

## Features

- Home feed: recently played, popular songs, albums, artists, community playlists, new releases
- Player bar with play/pause, next/previous, seek, volume, shuffle and repeat (off / all / one); space bar toggles playback
- Search with live results, plus genre browsing
- Album, playlist and artist pages
- Your Library: playlists, Liked Songs, recently played, followed artists
- Playlists: create, rename, add a cover, make public or private, add songs (with built-in search), remove and reorder songs, delete
- Like songs, follow artists
- Artist studio: upload songs (length is detected automatically) and create albums
- Settings: profile picture, display name, bio, password
- Works on phones, with a bottom navigation bar and a compact player

## Development

The backend must be running first (see `../backend/README.md`):

```bash
# terminal 1
cd backend && npm install && npm run seed && npm run dev

# terminal 2
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. Vite forwards `/api` and `/uploads` to the backend on port 5000, so no CORS setup is needed.
To use a backend somewhere else, set `VITE_BACKEND_URL`, for example `VITE_BACKEND_URL=http://localhost:6000 npm run dev`.

Demo logins (password `password123`): `listener` for a normal user, `nova` or `riverstone` for artists.

## Production

```bash
npm run build     # outputs frontend/dist
```

The backend serves `frontend/dist` automatically when it exists, so you only need to run one server (`cd backend && npm start`) and open http://localhost:5000.

## Structure

```
src/
├── main.jsx            # providers + router
├── App.jsx             # routes and page layout
├── api.js              # fetch wrapper (adds the auth token, parses errors)
├── context/            # AuthContext, LibraryContext (playlists, likes), PlayerContext (audio + queue)
├── components/         # Sidebar, TopBar, PlayerBar, SongList, cards, menus…
├── pages/              # Home, Search, Album, Playlist, Artist, Library, Liked, Upload, Settings, Auth
└── styles.css
```
