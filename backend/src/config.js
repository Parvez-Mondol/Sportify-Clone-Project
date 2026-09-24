require('dotenv').config({ quiet: true });
const path = require('path');

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  port: Number(process.env.PORT) || 5000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sportify.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  jwtSecret: process.env.JWT_SECRET || (env === 'production' ? null : 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxAudioSizeMb: Number(process.env.MAX_AUDIO_SIZE_MB) || 20,
  maxImageSizeMb: Number(process.env.MAX_IMAGE_SIZE_MB) || 5,
};

if (!config.jwtSecret) throw new Error('JWT_SECRET must be set in production');

module.exports = config;
