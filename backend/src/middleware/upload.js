const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const dirs = { audio: path.join(config.uploadDir, 'audio'), images: path.join(config.uploadDir, 'images') };
for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === 'audio' ? dirs.audio : dirs.images),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

function fileFilter(req, file, cb) {
  const allowed = file.fieldname === 'audio' ? AUDIO_TYPES : IMAGE_TYPES;
  if (!allowed.includes(file.mimetype)) {
    return cb(ApiError.badRequest(`Unsupported file type for "${file.fieldname}": ${file.mimetype}`));
  }
  cb(null, true);
}

const maxSize = Math.max(config.maxAudioSizeMb, config.maxImageSizeMb) * 1024 * 1024;
const uploader = multer({ storage, fileFilter, limits: { fileSize: maxSize } });

// Multer only supports one global size limit, so enforce the smaller image limit afterwards.
function enforceImageLimit(req, res, next) {
  const images = Object.values(req.files || {}).flat().filter((f) => f.fieldname !== 'audio');
  if (images.some((f) => f.size > config.maxImageSizeMb * 1024 * 1024)) {
    throw ApiError.badRequest(`Images must be at most ${config.maxImageSizeMb} MB`);
  }
  next();
}

function uploadFields(fields) {
  return [uploader.fields(fields), enforceImageLimit];
}

function imageUrl(file) {
  return file ? `/uploads/images/${file.filename}` : undefined;
}

function removeFile(filePath) {
  if (filePath) fs.promises.unlink(filePath).catch(() => {});
}

// Delete stored files given an audio filename and/or an /uploads/images URL.
function removeStored({ audioFile, imageUrl: url }) {
  if (audioFile) removeFile(path.join(dirs.audio, path.basename(audioFile)));
  if (url && url.startsWith('/uploads/images/')) removeFile(path.join(dirs.images, path.basename(url)));
}

function uploadedFiles(req) {
  return Object.values(req.files || {}).flat().concat(req.file ? [req.file] : []);
}

module.exports = { uploadFields, imageUrl, removeFile, removeStored, uploadedFiles, dirs };
