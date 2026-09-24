const express = require('express');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');
const { validate } = require('../utils/validate');
const serialize = require('../utils/serializers');
const { signToken, requireAuth } = require('../middleware/auth');
const { uploadFields, imageUrl, removeStored } = require('../middleware/upload');

const router = express.Router();

const registerRules = {
  username: { type: 'string', required: true, min: 3, max: 30, pattern: /^[a-zA-Z0-9_.]+$/, message: 'may only contain letters, numbers, "_" and "."' },
  email: { type: 'string', required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'must be a valid email' },
  password: { type: 'string', required: true, min: 8, max: 128 },
  displayName: { type: 'string', max: 60 },
  // Admins can't be self-registered; create them with the seed script or directly in the DB.
  role: { type: 'string', enum: ['listener', 'artist'] },
};

router.post('/register', (req, res) => {
  const db = req.app.locals.db;
  const data = validate(req.body, registerRules);
  const taken = db.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?').get(data.username, data.email);
  if (taken) {
    throw ApiError.conflict(taken.username.toLowerCase() === data.username.toLowerCase() ? 'Username is already taken' : 'Email is already registered');
  }
  const hash = bcrypt.hashSync(data.password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)')
    .run(data.username, data.email.toLowerCase(), hash, data.displayName || data.username, data.role || 'listener');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: serialize.privateUser(user) });
});

router.post('/login', (req, res) => {
  const { login, password } = validate(req.body, {
    login: { type: 'string', required: true },
    password: { type: 'string', required: true },
  });
  const user = req.app.locals.db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(login, login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw ApiError.unauthorized('Invalid credentials');
  }
  res.json({ token: signToken(user), user: serialize.privateUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: serialize.privateUser(req.user) });
});

router.patch('/me', requireAuth, uploadFields([{ name: 'avatar', maxCount: 1 }]), (req, res) => {
  const db = req.app.locals.db;
  const data = validate(req.body, {
    displayName: { type: 'string', min: 1, max: 60 },
    bio: { type: 'string', max: 500 },
  }, { partial: true });
  const avatar = imageUrl(req.files?.avatar?.[0]);

  db.prepare(`UPDATE users SET
      display_name = COALESCE(@displayName, display_name),
      bio = CASE WHEN @bioSet THEN @bio ELSE bio END,
      avatar_url = COALESCE(@avatar, avatar_url)
    WHERE id = @id`).run({
    id: req.user.id,
    displayName: data.displayName ?? null,
    bioSet: 'bio' in data ? 1 : 0,
    bio: data.bio ?? null,
    avatar: avatar ?? null,
  });
  if (avatar) removeStored({ imageUrl: req.user.avatar_url });
  res.json({ user: serialize.privateUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = validate(req.body, {
    currentPassword: { type: 'string', required: true },
    newPassword: { type: 'string', required: true, min: 8, max: 128 },
  });
  if (!bcrypt.compareSync(currentPassword, req.user.password_hash)) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  req.app.locals.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.status(204).end();
});

module.exports = router;
