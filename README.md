# Sportify-Clone-Project
My fourth project and big project

A Spotify-style music streaming app: upload music as an artist, then stream, like and organise it into playlists as a listener.

| Part | Tech | Docs |
| --- | --- | --- |
| [`backend/`](backend) | Node.js, Express 5, SQLite, JWT | [backend/README.md](backend/README.md): setup and every API endpoint |
| [`frontend/`](frontend) | React 19, React Router, Vite | [frontend/README.md](frontend/README.md) |

## Quick start

You need Node.js 18 or newer.

```bash
# 1. Backend (http://localhost:5000)
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run seed              # demo users, albums, songs and a playlist
npm run dev

# 2. Frontend, in a second terminal (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in with `listener` / `password123`, or as an artist with `nova` / `password123` to upload music.

### Run as a single server

```bash
cd frontend && npm run build
cd ../backend && npm start      # serves the app and the API on http://localhost:5000
```

## Tests

`cd backend && npm test` runs the API test suite. GitHub Actions (`.github/workflows/ci.yml`) runs it along with the frontend build on every push and pull request.
