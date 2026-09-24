const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { uploadedFiles, removeFile } = require('./upload');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Don't leave orphaned uploads behind when a request fails.
  for (const file of uploadedFiles(req)) removeFile(file.path);

  if (err instanceof multer.MulterError) {
    err = ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message);
  } else if (err.type === 'entity.parse.failed') {
    err = ApiError.badRequest('Malformed JSON body');
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    err = ApiError.badRequest('Referenced resource does not exist');
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      message: status >= 500 ? 'Internal server error' : err.message,
      ...(err.details && { details: err.details }),
    },
  });
}

module.exports = { notFound, errorHandler };
