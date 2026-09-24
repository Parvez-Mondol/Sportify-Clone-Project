const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');

const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(2000, 1)]);
const png = Buffer.from('89504e470d0a1a0a', 'hex');

let app;
let db;

beforeEach(() => {
  db = openDb(':memory:');
  app = createApp(db);
});

afterEach(() => db.close());

async function register(username, role = 'listener') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@test.dev`, password: 'password123', role });
  expect(res.status).toBe(201);
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
}

function uploadSong(auth, fields = {}) {
  const req = request(app).post('/api/songs').set(auth).attach('audio', wav, { filename: 'track.wav', contentType: 'audio/wav' });
  for (const [k, v] of Object.entries({ title: 'Test Song', genre: 'Pop', duration: 180, ...fields })) req.field(k, String(v));
  return req;
}

describe('auth', () => {
  test('register, login and fetch profile', async () => {
    const { user } = await register('alice');
    expect(user).toMatchObject({ username: 'alice', role: 'listener', email: 'alice@test.dev' });
    expect(user.password_hash).toBeUndefined();

    const login = await request(app).post('/api/auth/login').send({ login: 'alice@test.dev', password: 'password123' });
    expect(login.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.body.user.username).toBe('alice');
  });

  test('rejects duplicate usernames, bad input and wrong passwords', async () => {
    await register('alice');
    const dup = await request(app).post('/api/auth/register').send({ username: 'ALICE', email: 'x@test.dev', password: 'password123' });
    expect(dup.status).toBe(409);

    const bad = await request(app).post('/api/auth/register').send({ username: 'a', email: 'nope', password: 'short' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.details)).toEqual(['username', 'email', 'password']);

    const admin = await request(app).post('/api/auth/register').send({ username: 'bob', email: 'b@test.dev', password: 'password123', role: 'admin' });
    expect(admin.status).toBe(400);

    const wrong = await request(app).post('/api/auth/login').send({ login: 'alice', password: 'wrongpassword' });
    expect(wrong.status).toBe(401);
  });

  test('protected routes require a valid token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });

  test('update profile and change password', async () => {
    const { auth } = await register('alice');
    const upd = await request(app).patch('/api/auth/me').set(auth).field('displayName', 'Alice W').field('bio', 'hi')
      .attach('avatar', png, { filename: 'a.png', contentType: 'image/png' });
    expect(upd.status).toBe(200);
    expect(upd.body.user).toMatchObject({ displayName: 'Alice W', bio: 'hi' });
    expect(upd.body.user.avatarUrl).toMatch(/^\/uploads\/images\/.+\.png$/);
    expect((await request(app).get(upd.body.user.avatarUrl)).status).toBe(200);

    const change = await request(app).post('/api/auth/change-password').set(auth).send({ currentPassword: 'password123', newPassword: 'newpassword1' });
    expect(change.status).toBe(204);
    const login = await request(app).post('/api/auth/login').send({ login: 'alice', password: 'newpassword1' });
    expect(login.status).toBe(200);
  });
});

describe('songs', () => {
  test('only artists can upload; song can be fetched, listed and streamed', async () => {
    const listener = await register('lis');
    expect((await uploadSong(listener.auth)).status).toBe(403);

    const artist = await register('art', 'artist');
    const created = await uploadSong(artist.auth, { title: 'Hello' });
    expect(created.status).toBe(201);
    const song = created.body.song;
    expect(song).toMatchObject({ title: 'Hello', genre: 'Pop', duration: 180, artist: { id: artist.user.id }, playCount: 0 });

    const list = await request(app).get('/api/songs?genre=pop');
    expect(list.body.total).toBe(1);

    const stream = await request(app).get(song.streamUrl);
    expect(stream.status).toBe(200);
    expect(stream.headers['content-type']).toBe('audio/wav');
    expect(stream.body.length).toBe(wav.length);

    const partial = await request(app).get(song.streamUrl).set('Range', 'bytes=0-99');
    expect(partial.status).toBe(206);
    expect(partial.headers['content-range']).toBe(`bytes 0-99/${wav.length}`);
  });

  test('upload validation: audio required and file types checked', async () => {
    const artist = await register('art', 'artist');
    const noAudio = await request(app).post('/api/songs').set(artist.auth).field('title', 'x');
    expect(noAudio.status).toBe(400);

    const wrongType = await request(app).post('/api/songs').set(artist.auth).field('title', 'x')
      .attach('audio', png, { filename: 'x.png', contentType: 'image/png' });
    expect(wrongType.status).toBe(400);

    const noTitle = await request(app).post('/api/songs').set(artist.auth)
      .attach('audio', wav, { filename: 'x.wav', contentType: 'audio/wav' });
    expect(noTitle.status).toBe(400);
    // The rejected upload must not be left on disk.
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.readdirSync(path.join(process.env.UPLOAD_DIR, 'audio'))).not.toContainEqual(expect.stringContaining('x.wav'));
  });

  test('only the owner can edit or delete', async () => {
    const a = await register('artA', 'artist');
    const b = await register('artB', 'artist');
    const { song } = (await uploadSong(a.auth)).body;

    expect((await request(app).patch(`/api/songs/${song.id}`).set(b.auth).send({ title: 'Hacked' })).status).toBe(403);
    const upd = await request(app).patch(`/api/songs/${song.id}`).set(a.auth).send({ title: 'Renamed', genre: null });
    expect(upd.body.song).toMatchObject({ title: 'Renamed', genre: null, duration: 180 });

    expect((await request(app).delete(`/api/songs/${song.id}`).set(b.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/songs/${song.id}`).set(a.auth)).status).toBe(204);
    expect((await request(app).get(`/api/songs/${song.id}`)).status).toBe(404);
  });

  test('like, play count and listening history', async () => {
    const artist = await register('art', 'artist');
    const user = await register('lis');
    const { song } = (await uploadSong(artist.auth)).body;

    await request(app).post(`/api/songs/${song.id}/like`).set(user.auth).expect(200);
    await request(app).post(`/api/songs/${song.id}/like`).set(user.auth).expect(200); // idempotent
    const fetched = await request(app).get(`/api/songs/${song.id}`).set(user.auth);
    expect(fetched.body.song.liked).toBe(true);

    const liked = await request(app).get('/api/me/liked').set(user.auth);
    expect(liked.body.total).toBe(1);
    expect(liked.body.songs[0].addedAt).toBeDefined();

    await request(app).post(`/api/songs/${song.id}/play`).set(user.auth).expect(204);
    await request(app).post(`/api/songs/${song.id}/play`).expect(204);
    expect((await request(app).get(`/api/songs/${song.id}`)).body.song.playCount).toBe(2);
    const recent = await request(app).get('/api/me/recent').set(user.auth);
    expect(recent.body.songs).toHaveLength(1);

    await request(app).delete(`/api/songs/${song.id}/like`).set(user.auth).expect(200);
    expect((await request(app).get('/api/me/liked').set(user.auth)).body.total).toBe(0);
  });
});

describe('albums', () => {
  test('create album, add tracks, list in order', async () => {
    const artist = await register('art', 'artist');
    const other = await register('other', 'artist');
    const created = await request(app).post('/api/albums').set(artist.auth).field('title', 'LP').field('releaseDate', '2025-01-01')
      .attach('cover', png, { filename: 'c.png', contentType: 'image/png' });
    expect(created.status).toBe(201);
    const album = created.body.album;

    await uploadSong(artist.auth, { title: 'Second', albumId: album.id, trackNumber: 2 }).expect(201);
    await uploadSong(artist.auth, { title: 'First', albumId: album.id, trackNumber: 1 }).expect(201);
    // Can't put a song on someone else's album.
    await uploadSong(other.auth, { albumId: album.id }).expect(400);

    const res = await request(app).get(`/api/albums/${album.id}`);
    expect(res.body.album.songs.map((s) => s.title)).toEqual(['First', 'Second']);
    expect(res.body.album.songs[0].coverUrl).toBe(album.coverUrl);

    await request(app).delete(`/api/albums/${album.id}`).set(artist.auth).expect(204);
    const songs = await request(app).get(`/api/songs?artistId=${artist.user.id}`);
    expect(songs.body.total).toBe(2);
    expect(songs.body.songs[0].album).toBeNull();
  });
});

describe('playlists', () => {
  test('full playlist lifecycle', async () => {
    const artist = await register('art', 'artist');
    const owner = await register('own');
    const stranger = await register('str');
    const s1 = (await uploadSong(artist.auth, { title: 'One', duration: 100 })).body.song;
    const s2 = (await uploadSong(artist.auth, { title: 'Two', duration: 50 })).body.song;

    const { playlist } = (await request(app).post('/api/playlists').set(owner.auth).send({ name: 'Mix', isPublic: false })).body;
    expect(playlist.isPublic).toBe(false);

    // Private playlists are invisible to others.
    await request(app).get(`/api/playlists/${playlist.id}`).set(stranger.auth).expect(404);
    await request(app).post(`/api/playlists/${playlist.id}/songs`).set(stranger.auth).send({ songId: s1.id }).expect(404);

    await request(app).post(`/api/playlists/${playlist.id}/songs`).set(owner.auth).send({ songId: s1.id }).expect(201);
    await request(app).post(`/api/playlists/${playlist.id}/songs`).set(owner.auth).send({ songId: s2.id }).expect(201);
    await request(app).post(`/api/playlists/${playlist.id}/songs`).set(owner.auth).send({ songId: s2.id }).expect(409);
    await request(app).post(`/api/playlists/${playlist.id}/songs`).set(owner.auth).send({ songId: 999 }).expect(404);

    let detail = (await request(app).get(`/api/playlists/${playlist.id}`).set(owner.auth)).body.playlist;
    expect(detail.songs.map((s) => s.title)).toEqual(['One', 'Two']);
    expect(detail.duration).toBe(150);
    expect(detail.songCount).toBe(2);

    await request(app).put(`/api/playlists/${playlist.id}/songs/order`).set(owner.auth).send({ songIds: [s2.id] }).expect(400);
    await request(app).put(`/api/playlists/${playlist.id}/songs/order`).set(owner.auth).send({ songIds: [s2.id, s1.id] }).expect(200);
    detail = (await request(app).get(`/api/playlists/${playlist.id}`).set(owner.auth)).body.playlist;
    expect(detail.songs.map((s) => [s.title, s.position])).toEqual([['Two', 1], ['One', 2]]);

    await request(app).delete(`/api/playlists/${playlist.id}/songs/${s2.id}`).set(owner.auth).expect(204);
    detail = (await request(app).get(`/api/playlists/${playlist.id}`).set(owner.auth)).body.playlist;
    expect(detail.songs.map((s) => [s.title, s.position])).toEqual([['One', 1]]);

    await request(app).patch(`/api/playlists/${playlist.id}`).set(owner.auth).send({ isPublic: true, name: 'Public Mix' }).expect(200);
    const pub = await request(app).get('/api/playlists?q=public');
    expect(pub.body.playlists.map((p) => p.name)).toEqual(['Public Mix']);
    expect((await request(app).get('/api/me/playlists').set(owner.auth)).body.playlists).toHaveLength(1);

    await request(app).delete(`/api/playlists/${playlist.id}`).set(stranger.auth).expect(403);
    await request(app).delete(`/api/playlists/${playlist.id}`).set(owner.auth).expect(204);
  });
});

describe('users and search', () => {
  test('follow artists and view profiles', async () => {
    const artist = await register('star', 'artist');
    const fan = await register('fan');

    await request(app).post(`/api/users/${fan.user.id}/follow`).set(fan.auth).expect(400);
    await request(app).post(`/api/users/${artist.user.id}/follow`).set(fan.auth).expect(200);
    const profile = await request(app).get(`/api/users/${artist.user.id}`).set(fan.auth);
    expect(profile.body.user).toMatchObject({ followers: 1, isFollowing: true, songs: 0 });
    expect(profile.body.user.email).toBeUndefined();

    expect((await request(app).get('/api/me/following').set(fan.auth)).body.users[0].id).toBe(artist.user.id);
    expect((await request(app).get('/api/users/artists')).body.artists[0]).toMatchObject({ username: 'star', followers: 1 });

    await request(app).delete(`/api/users/${artist.user.id}/follow`).set(fan.auth).expect(200);
    expect((await request(app).get(`/api/users/${artist.user.id}`)).body.user.followers).toBe(0);
  });

  test('search across types and escape LIKE wildcards', async () => {
    const artist = await register('sunny', 'artist');
    await uploadSong(artist.auth, { title: 'Sunshine Road' }).expect(201);
    await uploadSong(artist.auth, { title: '100% Pure' }).expect(201);

    const res = await request(app).get('/api/search?q=sun');
    expect(res.body.songs.map((s) => s.title).sort()).toEqual(['100% Pure', 'Sunshine Road']); // artist name matches too
    expect(res.body.artists[0].username).toBe('sunny');

    const pct = await request(app).get('/api/search?q=%25&type=songs');
    expect(pct.body.songs.map((s) => s.title)).toEqual(['100% Pure']);
    expect(pct.body.albums).toBeUndefined();

    await request(app).get('/api/search').expect(400);
  });

  test('unknown routes and bad ids return 404 JSON', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
    expect((await request(app).get('/api/songs/abc')).body.error.message).toBe('Song not found');
  });
});
