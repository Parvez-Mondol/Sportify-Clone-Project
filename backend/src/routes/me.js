// The signed-in user's library: liked songs, own playlists, listening history, followed artists.
const express = require('express');
const { pagination } = require('../utils/validate');
const serialize = require('../utils/serializers');
const { songSelect, PLAYLIST_SELECT } = require('../utils/queries');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/liked', (req, res) => {
  const db = req.app.locals.db;
  const { limit, page, offset } = pagination(req.query, { defaultLimit: 50 });
  const from = 'liked_songs ls JOIN songs s ON s.id = ls.song_id';
  const rows = db.prepare(`${songSelect({ from, columns: 'ls.created_at AS added_at' })}
      WHERE ls.user_id = @viewerId ORDER BY ls.created_at DESC, ls.rowid DESC LIMIT @limit OFFSET @offset`)
    .all({ viewerId: req.user.id, limit, offset });
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM liked_songs WHERE user_id = ?').get(req.user.id);
  res.json({ songs: rows.map(serialize.song), page, limit, total });
});

router.get('/playlists', (req, res) => {
  const rows = req.app.locals.db
    .prepare(`${PLAYLIST_SELECT} WHERE p.owner_id = ? ORDER BY p.updated_at DESC, p.id DESC`)
    .all(req.user.id);
  res.json({ playlists: rows.map(serialize.playlist) });
});

router.get('/recent', (req, res) => {
  const { limit } = pagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const from = 'play_history h JOIN songs s ON s.id = h.song_id';
  const rows = req.app.locals.db.prepare(`${songSelect({ from, columns: 'h.played_at' })}
      WHERE h.user_id = @viewerId ORDER BY h.id DESC LIMIT @limit`)
    .all({ viewerId: req.user.id, limit });
  res.json({ songs: rows.map(serialize.song) });
});

router.get('/following', (req, res) => {
  const rows = req.app.locals.db.prepare(`SELECT u.* FROM follows f JOIN users u ON u.id = f.followee_id
      WHERE f.follower_id = ? ORDER BY f.created_at DESC`).all(req.user.id);
  res.json({ users: rows.map(serialize.user) });
});

module.exports = router;
