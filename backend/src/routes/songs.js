const express = require('express');
const path = require('path');
const ApiError = require('../utils/ApiError');
const { validate, parseId, pagination } = require('../utils/validate');
const serialize = require('../utils/serializers');
const { SONG_SELECT, likePattern } = require('../utils/queries');
const { optionalAuth, requireAuth, requireRole, assertOwner } = require('../middleware/auth');
const { uploadFields, imageUrl, removeStored, dirs } = require('../middleware/upload');

const router = express.Router();

const songRules = {
  title: { type: 'string', required: true, min: 1, max: 200 },
  genre: { type: 'string', max: 50 },
  duration: { type: 'int', min: 0, max: 24 * 60 * 60 },
  trackNumber: { type: 'int', min: 1, max: 999 },
  albumId: { type: 'int', min: 1 },
};

const SORTS = {
  newest: 's.created_at DESC, s.id DESC',
  popular: 's.play_count DESC, s.id DESC',
  title: 's.title COLLATE NOCASE ASC',
};

function getSong(db, id, viewerId = null) {
  const row = db.prepare(`${SONG_SELECT} WHERE s.id = @id`).get({ id, viewerId });
  if (!row) throw ApiError.notFound('Song');
  return row;
}

function checkAlbum(db, albumId, artistId) {
  if (albumId == null) return;
  const album = db.prepare('SELECT artist_id FROM albums WHERE id = ?').get(albumId);
  if (!album) throw ApiError.badRequest('Album does not exist');
  if (album.artist_id !== artistId) throw ApiError.badRequest('Album belongs to a different artist');
}

router.get('/', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const { limit, page, offset } = pagination(req.query);
  const where = [];
  const params = { viewerId: req.user?.id ?? null, limit, offset };
  if (req.query.genre) { where.push('s.genre = @genre COLLATE NOCASE'); params.genre = String(req.query.genre); }
  if (req.query.artistId) { where.push('s.artist_id = @artistId'); params.artistId = Number(req.query.artistId); }
  if (req.query.albumId) { where.push('s.album_id = @albumId'); params.albumId = Number(req.query.albumId); }
  if (req.query.q) { where.push("s.title LIKE @q ESCAPE '\\'"); params.q = likePattern(String(req.query.q)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = SORTS[req.query.sort] || SORTS.newest;

  const rows = db.prepare(`${SONG_SELECT} ${whereSql} ORDER BY ${order} LIMIT @limit OFFSET @offset`).all(params);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM songs s ${whereSql}`).get(params);
  res.json({ songs: rows.map(serialize.song), page, limit, total });
});

router.get('/genres', (req, res) => {
  const rows = req.app.locals.db
    .prepare('SELECT genre, COUNT(*) AS count FROM songs WHERE genre IS NOT NULL GROUP BY genre COLLATE NOCASE ORDER BY count DESC')
    .all();
  res.json({ genres: rows });
});

router.get('/:id', optionalAuth, (req, res) => {
  const song = getSong(req.app.locals.db, parseId(req.params.id, 'Song'), req.user?.id);
  res.json({ song: serialize.song(song) });
});

router.post(
  '/',
  requireAuth,
  requireRole('artist', 'admin'),
  uploadFields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  (req, res) => {
    const db = req.app.locals.db;
    const audio = req.files?.audio?.[0];
    if (!audio) throw ApiError.badRequest('Validation failed', { audio: 'is required' });
    const data = validate(req.body, songRules);
    checkAlbum(db, data.albumId, req.user.id);

    const { lastInsertRowid } = db.prepare(`INSERT INTO songs
        (title, artist_id, album_id, genre, duration, track_number, audio_file, audio_mime, cover_url)
        VALUES (@title, @artistId, @albumId, @genre, @duration, @trackNumber, @audioFile, @audioMime, @coverUrl)`)
      .run({
        title: data.title,
        artistId: req.user.id,
        albumId: data.albumId ?? null,
        genre: data.genre ?? null,
        duration: data.duration ?? 0,
        trackNumber: data.trackNumber ?? null,
        audioFile: audio.filename,
        audioMime: audio.mimetype,
        coverUrl: imageUrl(req.files?.cover?.[0]) ?? null,
      });
    res.status(201).json({ song: serialize.song(getSong(db, lastInsertRowid, req.user.id)) });
  },
);

router.patch('/:id', requireAuth, uploadFields([{ name: 'cover', maxCount: 1 }]), (req, res) => {
  const db = req.app.locals.db;
  const id = parseId(req.params.id, 'Song');
  const song = getSong(db, id);
  assertOwner(req.user, song.artist_id);
  const data = validate(req.body, songRules, { partial: true });
  if ('albumId' in data) checkAlbum(db, data.albumId, song.artist_id);
  const cover = imageUrl(req.files?.cover?.[0]);

  const next = {
    title: data.title ?? song.title,
    genre: 'genre' in data ? data.genre : song.genre,
    duration: data.duration ?? song.duration,
    track_number: 'trackNumber' in data ? data.trackNumber : song.track_number,
    album_id: 'albumId' in data ? data.albumId : song.album_id,
    cover_url: cover ?? song.cover_url,
  };
  db.prepare(`UPDATE songs SET title = @title, genre = @genre, duration = @duration,
      track_number = @track_number, album_id = @album_id, cover_url = @cover_url WHERE id = @id`).run({ ...next, id });
  if (cover) removeStored({ imageUrl: song.cover_url });
  res.json({ song: serialize.song(getSong(db, id, req.user.id)) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const song = getSong(db, parseId(req.params.id, 'Song'));
  assertOwner(req.user, song.artist_id);
  db.prepare('DELETE FROM songs WHERE id = ?').run(song.id);
  removeStored({ audioFile: song.audio_file, imageUrl: song.cover_url });
  res.status(204).end();
});

// Public so it can be used directly as an <audio src>. Express handles Range requests (206) for seeking.
router.get('/:id/stream', (req, res, next) => {
  const song = getSong(req.app.locals.db, parseId(req.params.id, 'Song'));
  res.type(song.audio_mime);
  res.sendFile(path.join(dirs.audio, path.basename(song.audio_file)), { acceptRanges: true }, (err) => {
    if (err && !res.headersSent) next(err.code === 'ENOENT' ? ApiError.notFound('Audio file') : err);
  });
});

// Clients call this once playback starts; bumps the play count and records listening history.
router.post('/:id/play', optionalAuth, (req, res) => {
  const db = req.app.locals.db;
  const song = getSong(db, parseId(req.params.id, 'Song'));
  db.transaction(() => {
    db.prepare('UPDATE songs SET play_count = play_count + 1 WHERE id = ?').run(song.id);
    if (req.user) db.prepare('INSERT INTO play_history (user_id, song_id) VALUES (?, ?)').run(req.user.id, song.id);
  })();
  res.status(204).end();
});

router.post('/:id/like', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const song = getSong(db, parseId(req.params.id, 'Song'));
  db.prepare('INSERT OR IGNORE INTO liked_songs (user_id, song_id) VALUES (?, ?)').run(req.user.id, song.id);
  res.json({ liked: true });
});

router.delete('/:id/like', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const song = getSong(db, parseId(req.params.id, 'Song'));
  db.prepare('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?').run(req.user.id, song.id);
  res.json({ liked: false });
});

module.exports = router;
