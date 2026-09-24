# Sportify Backend

REST API for the Sportify music streaming app (a Spotify clone), built with **Node.js, Express 5 and SQLite** (`better-sqlite3`).
It needs no separate database server: the database is a single file created on first start.

## Features

- JWT authentication with three roles: `listener`, `artist`, `admin`
- Songs: upload audio and cover art, edit, delete, filter, sort, stream with HTTP Range support (seeking works in `<audio>`)
- Albums with ordered tracks
- Playlists: public or private, add, remove and reorder songs
- Likes, play counts, listening history, following artists
- Search across songs, albums, artists and playlists

## Getting started

```bash
cd backend
npm install
cp .env.example .env   # then edit JWT_SECRET
npm run seed           # optional demo data (use `npm run seed -- --reset` to wipe first)
npm run dev            # auto-reload, or `npm start`
npm test
```

The API runs at `http://localhost:5000/api`. The seed creates these accounts, all with the password `password123`:
`admin@sportify.dev` (admin), `nova@sportify.dev` and `river@sportify.dev` (artists), and `listener@sportify.dev` (listener).

### Configuration (`.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port |
| `JWT_SECRET` | dev value | **Required in production** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `DB_PATH` | `./data/sportify.db` | SQLite file |
| `UPLOAD_DIR` | `./uploads` | Where audio and images are stored |
| `CORS_ORIGIN` | `*` | Comma-separated list of allowed origins |
| `FRONTEND_DIST` | `../frontend/dist` | Built frontend to serve at `/` (only if it exists) |
| `MAX_AUDIO_SIZE_MB` / `MAX_IMAGE_SIZE_MB` | `20` / `5` | Upload limits |

## API

Send `Authorization: Bearer <token>` for authenticated routes. JSON bodies use camelCase.
Routes that take files use `multipart/form-data`: `audio` for songs, `cover` for albums, songs and playlists, and `avatar` for profiles.
Errors look like `{ "error": { "message": "...", "details": { "field": "problem" } } }`.
List endpoints accept `page` and `limit` and return the items under a named key plus paging info, for example `{ songs, page, limit, total }`.

Legend: 🔓 public · 🔑 signed in · 🎤 artist or admin · 👤 owner or admin

### Auth — `/api/auth`
| Method | Path | | Description |
| --- | --- | --- | --- |
| POST | `/register` | 🔓 | `{ username, email, password, displayName?, role?: "listener" \| "artist" }` returns `{ token, user }` |
| POST | `/login` | 🔓 | `{ login (email or username), password }` returns `{ token, user }` |
| GET | `/me` | 🔑 | Current user |
| PATCH | `/me` | 🔑 | `displayName`, `bio`, `avatar` file |
| POST | `/change-password` | 🔑 | `{ currentPassword, newPassword }` |

### Songs — `/api/songs`
| Method | Path | | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔓 | Filters: `genre`, `artistId`, `albumId`, `q`. Sort: `sort=newest\|popular\|title` |
| GET | `/genres` | 🔓 | Genres with song counts |
| GET | `/:id` | 🔓 | Song details (includes `liked` for the signed-in user) |
| POST | `/` | 🎤 | Multipart: `audio` (required), `cover`, `title`, `genre`, `duration` (seconds), `albumId`, `trackNumber` |
| PATCH | `/:id` | 👤 | Same fields except `audio` |
| DELETE | `/:id` | 👤 | Also deletes the stored files |
| GET | `/:id/stream` | 🔓 | Audio stream, supports `Range` |
| POST | `/:id/play` | 🔓 | Records a play (and history when signed in) |
| POST / DELETE | `/:id/like` | 🔑 | Like or unlike |

### Albums — `/api/albums`
| Method | Path | | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔓 | Filters: `artistId`, `genre`, `q` |
| GET | `/:id` | 🔓 | Album with its songs in track order |
| POST | `/` | 🎤 | `title`, `genre`, `releaseDate` (YYYY-MM-DD), `cover` |
| PATCH / DELETE | `/:id` | 👤 | Deleting an album keeps its songs as singles |

### Playlists — `/api/playlists`
| Method | Path | | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔓 | Public playlists. Filters: `q`, `ownerId` |
| GET | `/:id` | 🔓 | Playlist with songs and total duration. Private playlists are visible only to their owner |
| POST | `/` | 🔑 | `{ name, description?, isPublic? }` (+ `cover`) |
| PATCH / DELETE | `/:id` | 👤 | |
| POST | `/:id/songs` | 👤 | `{ songId }` appends a song |
| DELETE | `/:id/songs/:songId` | 👤 | Remove a song |
| PUT | `/:id/songs/order` | 👤 | `{ songIds: [...] }` sets the full new order |

### Users — `/api/users`
| Method | Path | | Description |
| --- | --- | --- | --- |
| GET | `/artists` | 🔓 | Artist directory (`q` to filter) |
| GET | `/:id` | 🔓 | Profile with follower, following, song and album counts |
| GET | `/:id/songs` · `/:id/albums` · `/:id/playlists` · `/:id/followers` | 🔓 | |
| POST / DELETE | `/:id/follow` | 🔑 | Follow or unfollow |

### Library — `/api/me` (🔑)
`GET /liked` · `GET /playlists` (including private ones) · `GET /recent` · `GET /following`

### Search — `/api/search`
`GET /api/search?q=term&type=songs,albums,artists,playlists&limit=10` returns one list per requested type.

## Project structure

```
backend/
├── src/
│   ├── server.js          # entry point
│   ├── app.js             # Express app factory (used by tests)
│   ├── config.js
│   ├── db/                # schema.sql + connection
│   ├── middleware/        # auth, uploads, errors
│   ├── routes/            # auth, songs, albums, playlists, users, me, search
│   └── utils/             # validation, serializers, shared SQL
├── scripts/seed.js
└── tests/api.test.js
```
