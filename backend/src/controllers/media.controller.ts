import { Request, Response } from 'express';
import { z } from 'zod';
import { mediaRepository } from '../repositories/media.repository';
import { auditService } from '../services/audit.service';
import { acceptUploadedFile, cleanOriginalName, deleteStoredFile, UploadError } from '../services/upload.service';
import { ApiError } from '../utils/api-error';
import { ok, paginationMeta } from '../utils/response';
import { idParam } from '../validators/common';
import { parse } from '../validators/parse';

const listQuery = z.object({
  kind: z.enum(['image', 'video']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(48),
});

export const mediaController = {
  async upload(req: Request, res: Response) {
    const file = req.file;
    if (!file) throw ApiError.badRequest('Choose a file to upload (form field "file").');
    let stored;
    try {
      stored = await acceptUploadedFile(file.path, file.size);
    } catch (err) {
      if (err instanceof UploadError) throw new ApiError(err.status, err.message, err.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNSUPPORTED_FILE');
      throw err;
    }
    let id: number;
    try {
      id = await mediaRepository.insert({
        kind: stored.kind,
        originalName: cleanOriginalName(file.originalname),
        storedPath: stored.storedPath,
        mimeType: stored.mime,
        sizeBytes: stored.sizeBytes,
        uploadedBy: req.admin!.id,
      });
    } catch (err) {
      await deleteStoredFile(stored.storedPath).catch(() => undefined);
      throw err;
    }
    await auditService.log(req.admin!.id, 'media.upload', 'media_file', id);
    ok(res, await mediaRepository.findById(id), 201);
  },

  async list(req: Request, res: Response) {
    const q = parse(listQuery, req.query);
    const { items, total } = await mediaRepository.list(q.kind, q.page, q.pageSize);
    ok(res, items, 200, paginationMeta(q.page, q.pageSize, total));
  },

  async usages(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const media = await mediaRepository.findById(id);
    if (!media) throw ApiError.notFound('File not found');
    ok(res, { id, usedIn: await mediaRepository.usages(media.url) });
  },

  async remove(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const media = await mediaRepository.findById(id);
    if (!media) throw ApiError.notFound('File not found');
    await mediaRepository.remove(id);
    await deleteStoredFile(media.url);
    await auditService.log(req.admin!.id, 'media.delete', 'media_file', id);
    ok(res, { id, deleted: true });
  },
};
