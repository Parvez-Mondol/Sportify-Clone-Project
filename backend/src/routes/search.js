const express = require('express');
const ApiError = require('../utils/ApiError');
const serialize = require('../utils/serializers');
const { SONG_SELECT, ALBUM_SELECT, PLAYLIST_SELECT, likePattern } = require('../utils/queries');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
const TYPES = ['songs', 'albums', 'artists', 'playlists'];

// GET /api/search?q=term&type=songs,artists&limit=10
router.get('/', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const q = String(req.query.q || '').trim();
  if (!q) throw ApiError.badRequest('Query parameter "q" is required');
  const types = req.query.type ? String(req.query.type).split(',').filter((t) => TYPES.includes(t)) : TYPES;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const params = { q: likePattern(q), limit, viewerId: req.user?.id ?? null };
  const result = {};

  if (types.includes('songs')) {
    result.songs = db.prepare(`${SONG_SELECT}
        WHERE s.title LIKE @q ESCAPE '\\' OR u.display_name LIKE @q ESCAPE '\\' OR a.title LIKE @q ESCAPE '\\'
        ORDER BY s.play_count DESC LIMIT @limit`).all(params).map(serialize.song);
  }
  if (types.includes('albums')) {
    result.albums = db.prepare(`${ALBUM_SELECT}
        WHERE al.title LIKE @q ESCAPE '\\' OR u.display_name LIKE @q ESCAPE '\\'
        ORDER BY al.created_at DESC LIMIT @limit`).all(params).map(serialize.album);
  }
  if (types.includes('artists')) {
    result.artists = db.prepare(`SELECT * FROM users
        WHERE role = 'artist' AND (display_name LIKE @q ESCAPE '\\' OR username LIKE @q ESCAPE '\\')
        LIMIT @limit`).all(params).map(serialize.user);
  }
  if (types.includes('playlists')) {
    result.playlists = db.prepare(`${PLAYLIST_SELECT}
        WHERE p.is_public = 1 AND p.name LIKE @q ESCAPE '\\'
        ORDER BY p.updated_at DESC LIMIT @limit`).all(params).map(serialize.playlist);
  }
  res.json(result);
});

module.exports = router;
