import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { absoluteMaxBytes, tempDir } from '../services/upload.service';
import { ApiError } from '../utils/api-error';

/** Streams ONE file (field name "file") to a random temp name; type checks happen afterwards. */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir()),
    filename: (_req, _file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}.part`),
  }),
  limits: { fileSize: absoluteMaxBytes(), files: 1, fields: 5, fieldSize: 1024, parts: 8 },
}).single('file');

export function singleFileUpload(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'The file is too large.', 'PAYLOAD_TOO_LARGE'));
      return next(ApiError.badRequest(`Upload failed: ${err.message}`));
    }
    next(err);
  });
}
