const express = require('express');
const ApiError = require('../utils/ApiError');
const { validate, parseId, pagination } = require('../utils/validate');
const serialize = require('../utils/serializers');
const { PLAYLIST_SELECT, songSelect, likePattern } = require('../utils/queries');
const { optionalAuth, requireAuth, assertOwner } = require('../middleware/auth');
const { uploadFields, imageUrl, removeStored } = require('../middleware/upload');

const router = express.Router();

const playlistRules = {
  name: { type: 'string', required: true, min: 1, max: 100 },
  description: { type: 'string', max: 500 },
  isPublic: { type: 'bool' },
};

// Private playlists are only visible to their owner (and admins); report them as missing to everyone else.
function getPlaylist(db, id, viewer) {
  const row = db.prepare(`${PLAYLIST_SELECT} WHERE p.id = ?`).get(id);
  const canSee = row && (row.is_public || (viewer && (viewer.id === row.owner_id || viewer.role === 'admin')));
  if (!canSee) throw ApiError.notFound('Playlist');
  return row;
}

function getEditablePlaylist(db, id, user) {
  const playlist = getPlaylist(db, id, user);
  assertOwner(user, playlist.owner_id);
  return playlist;
}

function touch(db, id) {
  db.prepare("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?").run(id);
}

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { limit, page, offset } = pagination(req.query);
  const where = ['p.is_public = 1'];
  const params = { limit, offset };
  if (req.query.q) { where.push("p.name LIKE @q ESCAPE '\\'"); params.q = likePattern(String(req.query.q)); }
  if (req.query.ownerId) { where.push('p.owner_id = @ownerId'); params.ownerId = Number(req.query.ownerId); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const rows = db.prepare(`${PLAYLIST_SELECT} ${whereSql} ORDER BY p.updated_at DESC, p.id DESC LIMIT @limit OFFSET @offset`).all(params);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM playlists p ${whereSql}`).get(params);
  res.json({ playlists: rows.map(serialize.playlist), page, limit, total });
});

router.get('/:id', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const playlist = getPlaylist(db, parseId(req.params.id, 'Playlist'), req.user);
  const from = 'playlist_songs ps JOIN songs s ON s.id = ps.song_id';
  const songs = db.prepare(`${songSelect({ from, columns: 'ps.position, ps.added_at' })}
      WHERE ps.playlist_id = @playlistId ORDER BY ps.position`)
    .all({ playlistId: playlist.id, viewerId: req.user?.id ?? null });
  const duration = songs.reduce((sum, s) => sum + s.duration, 0);
  res.json({ playlist: { ...serialize.playlist(playlist), duration, songs: songs.map(serialize.song) } });
});

router.post('/', requireAuth, uploadFields([{ name: 'cover', maxCount: 1 }]), (req, res) => {
  const db = req.app.locals.db;
  const data = validate(req.body, playlistRules);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO playlists (name, description, owner_id, is_public, cover_url) VALUES (?, ?, ?, ?, ?)')
    .run(data.name, data.description ?? null, req.user.id, data.isPublic === false ? 0 : 1, imageUrl(req.files?.cover?.[0]) ?? null);
  res.status(201).json({ playlist: serialize.playlist(getPlaylist(db, lastInsertRowid, req.user)) });
});

router.patch('/:id', requireAuth, uploadFields([{ name: 'cover', maxCount: 1 }]), (req, res) => {
  const db = req.app.locals.db;
  const playlist = getEditablePlaylist(db, parseId(req.params.id, 'Playlist'), req.user);
  const data = validate(req.body, playlistRules, { partial: true });
  const cover = imageUrl(req.files?.cover?.[0]);
  db.prepare(`UPDATE playlists SET name = ?, description = ?, is_public = ?, cover_url = ?, updated_at = datetime('now')
      WHERE id = ?`).run(
    data.name ?? playlist.name,
    'description' in data ? data.description : playlist.description,
    'isPublic' in data && data.isPublic !== null ? Number(data.isPublic) : playlist.is_public,
    cover ?? playlist.cover_url,
    playlist.id,
  );
  if (cover) removeStored({ imageUrl: playlist.cover_url });
  res.json({ playlist: serialize.playlist(getPlaylist(db, playlist.id, req.user)) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const playlist = getEditablePlaylist(db, parseId(req.params.id, 'Playlist'), req.user);
  db.prepare('DELETE FROM playlists WHERE id = ?').run(playlist.id);
  removeStored({ imageUrl: playlist.cover_url });
  res.status(204).end();
});

router.post('/:id/songs', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const playlist = getEditablePlaylist(db, parseId(req.params.id, 'Playlist'), req.user);
  const { songId } = validate(req.body, { songId: { type: 'int', required: true, min: 1 } });
  if (!db.prepare('SELECT 1 FROM songs WHERE id = ?').get(songId)) throw ApiError.notFound('Song');
  if (db.prepare('SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(playlist.id, songId)) {
    throw ApiError.conflict('Song is already in this playlist');
  }
  db.transaction(() => {
    db.prepare(`INSERT INTO playlist_songs (playlist_id, song_id, position)
        VALUES (@p, @s, (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_songs WHERE playlist_id = @p))`)
      .run({ p: playlist.id, s: songId });
    touch(db, playlist.id);
  })();
  res.status(201).json({ playlistId: playlist.id, songId });
});

router.delete('/:id/songs/:songId', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const playlist = getEditablePlaylist(db, parseId(req.params.id, 'Playlist'), req.user);
  const songId = parseId(req.params.songId, 'Song');
  const entry = db.prepare('SELECT position FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(playlist.id, songId);
  if (!entry) throw ApiError.notFound('Song in playlist');
  db.transaction(() => {
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(playlist.id, songId);
    db.prepare('UPDATE playlist_songs SET position = position - 1 WHERE playlist_id = ? AND position > ?').run(playlist.id, entry.position);
    touch(db, playlist.id);
  })();
  res.status(204).end();
});

// Reorder: body is the full list of song ids in their new order.
router.put('/:id/songs/order', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const playlist = getEditablePlaylist(db, parseId(req.params.id, 'Playlist'), req.user);
  const { songIds } = req.body || {};
  const current = db.prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ?').all(playlist.id).map((r) => r.song_id);
  const valid = Array.isArray(songIds)
    && songIds.length === current.length
    && new Set(songIds).size === songIds.length
    && songIds.every((id) => current.includes(id));
  if (!valid) throw ApiError.badRequest('songIds must contain every song in the playlist exactly once');

  const update = db.prepare('UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?');
  db.transaction(() => {
    songIds.forEach((songId, i) => update.run(i + 1, playlist.id, songId));
    touch(db, playlist.id);
  })();
  res.json({ songIds });
});

module.exports = router;
