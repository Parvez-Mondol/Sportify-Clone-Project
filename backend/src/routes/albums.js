const express = require('express');
const ApiError = require('../utils/ApiError');
const { validate, parseId, pagination } = require('../utils/validate');
const serialize = require('../utils/serializers');
const { ALBUM_SELECT, SONG_SELECT, likePattern } = require('../utils/queries');
const { optionalAuth, requireAuth, requireRole, assertOwner } = require('../middleware/auth');
const { uploadFields, imageUrl, removeStored } = require('../middleware/upload');

const router = express.Router();

const albumRules = {
  title: { type: 'string', required: true, min: 1, max: 200 },
  genre: { type: 'string', max: 50 },
  releaseDate: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'must be YYYY-MM-DD' },
};

function getAlbum(db, id) {
  const row = db.prepare(`${ALBUM_SELECT} WHERE al.id = ?`).get(id);
  if (!row) throw ApiError.notFound('Album');
  return row;
}

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { limit, page, offset } = pagination(req.query);
  const where = [];
  const params = { limit, offset };
  if (req.query.artistId) { where.push('al.artist_id = @artistId'); params.artistId = Number(req.query.artistId); }
  if (req.query.genre) { where.push('al.genre = @genre COLLATE NOCASE'); params.genre = String(req.query.genre); }
  if (req.query.q) { where.push("al.title LIKE @q ESCAPE '\\'"); params.q = likePattern(String(req.query.q)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`${ALBUM_SELECT} ${whereSql} ORDER BY al.created_at DESC, al.id DESC LIMIT @limit OFFSET @offset`).all(params);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM albums al ${whereSql}`).get(params);
  res.json({ albums: rows.map(serialize.album), page, limit, total });
});

router.get('/:id', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const album = getAlbum(db, parseId(req.params.id, 'Album'));
  const songs = db
    .prepare(`${SONG_SELECT} WHERE s.album_id = @albumId ORDER BY s.track_number IS NULL, s.track_number, s.id`)
    .all({ albumId: album.id, viewerId: req.user?.id ?? null });
  res.json({ album: { ...serialize.album(album), songs: songs.map(serialize.song) } });
});

router.post('/', requireAuth, requireRole('artist', 'admin'), uploadFields([{ name: 'cover', maxCount: 1 }]), (req, res) => {
  const db = req.app.locals.db;
  const data = validate(req.body, albumRules);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO albums (title, artist_id, genre, release_date, cover_url) VALUES (?, ?, ?, ?, ?)')
    .run(data.title, req.user.id, data.genre ?? null, data.releaseDate ?? null, imageUrl(req.files?.cover?.[0]) ?? null);
  res.status(201).json({ album: serialize.album(getAlbum(db, lastInsertRowid)) });
});

router.patch('/:id', requireAuth, uploadFields([{ name: 'cover', maxCount: 1 }]), (req, res) => {
  const db = req.app.locals.db;
  const album = getAlbum(db, parseId(req.params.id, 'Album'));
  assertOwner(req.user, album.artist_id);
  const data = validate(req.body, albumRules, { partial: true });
  const cover = imageUrl(req.files?.cover?.[0]);
  db.prepare('UPDATE albums SET title = ?, genre = ?, release_date = ?, cover_url = ? WHERE id = ?').run(
    data.title ?? album.title,
    'genre' in data ? data.genre : album.genre,
    'releaseDate' in data ? data.releaseDate : album.release_date,
    cover ?? album.cover_url,
    album.id,
  );
  if (cover) removeStored({ imageUrl: album.cover_url });
  res.json({ album: serialize.album(getAlbum(db, album.id)) });
});

// Songs on the album are kept as singles (album_id is set to NULL).
router.delete('/:id', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const album = getAlbum(db, parseId(req.params.id, 'Album'));
  assertOwner(req.user, album.artist_id);
  db.prepare('DELETE FROM albums WHERE id = ?').run(album.id);
  removeStored({ imageUrl: album.cover_url });
  res.status(204).end();
});

module.exports = router;
