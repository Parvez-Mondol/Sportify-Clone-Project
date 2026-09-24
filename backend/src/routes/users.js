const express = require('express');
const ApiError = require('../utils/ApiError');
const { parseId, pagination } = require('../utils/validate');
const serialize = require('../utils/serializers');
const { SONG_SELECT, ALBUM_SELECT, PLAYLIST_SELECT, likePattern } = require('../utils/queries');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

function getUser(db, id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) throw ApiError.notFound('User');
  return row;
}

// Artist directory (users with the artist role).
router.get('/artists', (req, res) => {
  const db = req.app.locals.db;
  const { limit, page, offset } = pagination(req.query);
  const params = { limit, offset, q: req.query.q ? likePattern(String(req.query.q)) : null };
  const whereSql = "WHERE u.role = 'artist' AND (@q IS NULL OR u.display_name LIKE @q ESCAPE '\\' OR u.username LIKE @q ESCAPE '\\')";
  const rows = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id) AS followers
      FROM users u ${whereSql} ORDER BY followers DESC, u.id LIMIT @limit OFFSET @offset`).all(params);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM users u ${whereSql}`).get(params);
  res.json({ artists: rows.map((r) => ({ ...serialize.user(r), followers: r.followers })), page, limit, total });
});

router.get('/:id', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  const counts = db.prepare(`SELECT
      (SELECT COUNT(*) FROM follows WHERE followee_id = @id) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = @id) AS following,
      (SELECT COUNT(*) FROM songs WHERE artist_id = @id) AS songs,
      (SELECT COUNT(*) FROM albums WHERE artist_id = @id) AS albums,
      EXISTS (SELECT 1 FROM follows WHERE follower_id = @viewerId AND followee_id = @id) AS isFollowing`)
    .get({ id: user.id, viewerId: req.user?.id ?? null });
  res.json({ user: { ...serialize.user(user), ...counts, isFollowing: Boolean(counts.isFollowing) } });
});

router.get('/:id/songs', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  const { limit, page, offset } = pagination(req.query, { defaultLimit: 50 });
  const order = req.query.sort === 'newest' ? 's.created_at DESC, s.id DESC' : 's.play_count DESC, s.id DESC';
  const rows = db.prepare(`${SONG_SELECT} WHERE s.artist_id = @artistId ORDER BY ${order} LIMIT @limit OFFSET @offset`)
    .all({ artistId: user.id, viewerId: req.user?.id ?? null, limit, offset });
  res.json({ songs: rows.map(serialize.song), page, limit });
});

router.get('/:id/albums', (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  const rows = db.prepare(`${ALBUM_SELECT} WHERE al.artist_id = ? ORDER BY al.release_date DESC, al.id DESC`).all(user.id);
  res.json({ albums: rows.map(serialize.album) });
});

router.get('/:id/playlists', (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  const rows = db.prepare(`${PLAYLIST_SELECT} WHERE p.owner_id = ? AND p.is_public = 1 ORDER BY p.updated_at DESC`).all(user.id);
  res.json({ playlists: rows.map(serialize.playlist) });
});

router.get('/:id/followers', (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  const rows = db.prepare(`SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id
      WHERE f.followee_id = ? ORDER BY f.created_at DESC`).all(user.id);
  res.json({ users: rows.map(serialize.user) });
});

router.post('/:id/follow', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  if (user.id === req.user.id) throw ApiError.badRequest('You cannot follow yourself');
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)').run(req.user.id, user.id);
  res.json({ following: true });
});

router.delete('/:id/follow', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const user = getUser(db, parseId(req.params.id, 'User'));
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(req.user.id, user.id);
  res.json({ following: false });
});

module.exports = router;
