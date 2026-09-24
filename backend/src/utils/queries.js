// Shared SELECT fragments so every endpoint returns songs/albums/playlists in the same shape.

// `liked` is computed for the viewer bound as @viewerId (NULL for anonymous requests).
// `from` lets callers select songs through a join table (e.g. playlist_songs) and `columns` adds extra fields.
function songSelect({ from = 'songs s', columns = '' } = {}) {
  return `
  SELECT s.*, u.display_name AS artist_name, a.title AS album_title, a.cover_url AS album_cover_url,
         EXISTS (SELECT 1 FROM liked_songs l WHERE l.song_id = s.id AND l.user_id = @viewerId) AS liked
         ${columns ? `, ${columns}` : ''}
  FROM ${from}
  JOIN users u ON u.id = s.artist_id
  LEFT JOIN albums a ON a.id = s.album_id`;
}

const SONG_SELECT = songSelect();

const ALBUM_SELECT = `
  SELECT al.*, u.display_name AS artist_name,
         (SELECT COUNT(*) FROM songs s WHERE s.album_id = al.id) AS song_count
  FROM albums al
  JOIN users u ON u.id = al.artist_id`;

const PLAYLIST_SELECT = `
  SELECT p.*, u.display_name AS owner_name,
         (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS song_count
  FROM playlists p
  JOIN users u ON u.id = p.owner_id`;

// Escape LIKE wildcards in user input; pair with `ESCAPE '\\'`.
function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

module.exports = { songSelect, SONG_SELECT, ALBUM_SELECT, PLAYLIST_SELECT, likePattern };
