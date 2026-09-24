const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { dirs } = require('./middleware/upload');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp(db) {
  const app = express();
  app.locals.db = db;

  app.use(helmet({
    // Allow a frontend on another origin to load cover images and audio.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // The bundled frontend reads local files through blob: URLs (upload length detection, avatar preview).
    contentSecurityPolicy: {
      directives: {
        mediaSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  app.use('/uploads/images', express.static(dirs.images, { maxAge: '7d' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/me', require('./routes/me'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/songs', require('./routes/songs'));
  app.use('/api/albums', require('./routes/albums'));
  app.use('/api/playlists', require('./routes/playlists'));
  app.use('/api/search', require('./routes/search'));

  // In production, serve the built React app (frontend/dist) from the same server.
  // Unknown non-API paths get index.html so client-side routes like /album/3 work on reload.
  if (fs.existsSync(path.join(config.frontendDist, 'index.html'))) {
    app.use(express.static(config.frontendDist, { index: false }));
    app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
