const config = require('./config');
const { openDb } = require('./db');
const { createApp } = require('./app');

const db = openDb(config.dbPath);
const app = createApp(db);

const server = app.listen(config.port, () => {
  console.log(`Sportify API listening on http://localhost:${config.port} (${config.env})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
