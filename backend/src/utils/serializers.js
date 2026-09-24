// Map snake_case DB rows to the camelCase JSON shape the API returns.

function user(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
  };
}

function privateUser(row) {
  return row && { ...user(row), email: row.email };
}

function song(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    artist: { id: row.artist_id, displayName: row.artist_name },
    album: row.album_id ? { id: row.album_id, title: row.album_title } : null,
    genre: row.genre,
    duration: row.duration,
    trackNumber: row.track_number,
    coverUrl: row.cover_url || row.album_cover_url || null,
    streamUrl: `/api/songs/${row.id}/stream`,
    playCount: row.play_count,
    createdAt: row.created_at,
    ...(row.liked !== undefined && { liked: Boolean(row.liked) }),
    ...(row.position !== undefined && { position: row.position }),
    ...(row.added_at !== undefined && { addedAt: row.added_at }),
    ...(row.played_at !== undefined && { playedAt: row.played_at }),
  };
}

function album(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    artist: { id: row.artist_id, displayName: row.artist_name },
    coverUrl: row.cover_url,
    genre: row.genre,
    releaseDate: row.release_date,
    songCount: row.song_count ?? undefined,
    createdAt: row.created_at,
  };
}

function playlist(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    owner: { id: row.owner_id, displayName: row.owner_name },
    isPublic: Boolean(row.is_public),
    coverUrl: row.cover_url,
    songCount: row.song_count ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { user, privateUser, song, album, playlist };
