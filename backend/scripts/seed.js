// Populates the database with demo users, albums, songs and playlists.
// Usage: npm run seed            (adds demo data if the DB is empty)
//        npm run seed -- --reset (wipes the DB first)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { openDb } = require('../src/db');
const { dirs } = require('../src/middleware/upload');

// A short silent 8 kHz mono WAV, so the stream endpoint has something real to serve.
function silentWav(seconds) {
  const sampleRate = 8000;
  const dataSize = sampleRate * seconds;
  const buf = Buffer.alloc(44 + dataSize, 0x80);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataSize, 40);
  return buf;
}

if (process.argv.includes('--reset') && config.dbPath !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(config.dbPath + suffix, { force: true });
}
const db = openDb(config.dbPath);

if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
  console.log('Database already has data; run with --reset to start over.');
  process.exit(0);
}

const password = bcrypt.hashSync('password123', 10);
const addUser = db.prepare('INSERT INTO users (username, email, password_hash, display_name, role, bio) VALUES (?, ?, ?, ?, ?, ?)');
const addAlbum = db.prepare('INSERT INTO albums (title, artist_id, genre, release_date) VALUES (?, ?, ?, ?)');
const addSong = db.prepare(`INSERT INTO songs (title, artist_id, album_id, genre, duration, track_number, audio_file, audio_mime, play_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'audio/wav', ?)`);

function song(title, artistId, albumId, genre, track) {
  const seconds = 5;
  const file = `${crypto.randomUUID()}.wav`;
  fs.writeFileSync(path.join(dirs.audio, file), silentWav(seconds));
  return addSong.run(title, artistId, albumId, genre, seconds, track, file, Math.floor(Math.random() * 1000)).lastInsertRowid;
}

db.transaction(() => {
  addUser.run('admin', 'admin@sportify.dev', password, 'Admin', 'admin', null);
  const nova = addUser.run('nova', 'nova@sportify.dev', password, 'Nova Lights', 'artist', 'Synthwave from the future.').lastInsertRowid;
  const river = addUser.run('riverstone', 'river@sportify.dev', password, 'River Stone', 'artist', 'Acoustic folk storyteller.').lastInsertRowid;
  const listener = addUser.run('listener', 'listener@sportify.dev', password, 'Demo Listener', 'listener', null).lastInsertRowid;

  const neon = addAlbum.run('Neon Horizons', nova, 'Electronic', '2025-03-14').lastInsertRowid;
  const woods = addAlbum.run('Quiet Woods', river, 'Folk', '2024-10-02').lastInsertRowid;

  const songs = [
    song('Midnight Drive', nova, neon, 'Electronic', 1),
    song('Pixel Sunset', nova, neon, 'Electronic', 2),
    song('Chrome Hearts', nova, neon, 'Electronic', 3),
    song('Afterglow (Single)', nova, null, 'Electronic', null),
    song('Pinecone Path', river, woods, 'Folk', 1),
    song('Letters Home', river, woods, 'Folk', 2),
    song('Campfire Song', river, woods, 'Folk', 3),
  ];

  const playlist = db.prepare("INSERT INTO playlists (name, description, owner_id, is_public) VALUES ('Chill Mix', 'Something for every mood', ?, 1)")
    .run(listener).lastInsertRowid;
  const addToPlaylist = db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)');
  [songs[0], songs[4], songs[2], songs[5]].forEach((id, i) => addToPlaylist.run(playlist, id, i + 1));

  const like = db.prepare('INSERT INTO liked_songs (user_id, song_id) VALUES (?, ?)');
  like.run(listener, songs[0]);
  like.run(listener, songs[6]);
  db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(listener, nova);
})();

console.log('Seeded demo data. All accounts use the password "password123":');
console.log('  admin@sportify.dev (admin), nova@sportify.dev / river@sportify.dev (artists), listener@sportify.dev (listener)');
db.close();
