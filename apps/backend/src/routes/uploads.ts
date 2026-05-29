// /apps/backend/src/routes/uploads.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { sql } from 'slonik';
import { z } from 'zod';
import { fileTypeFromBuffer } from 'file-type';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../config/storage.js';

const router = Router();

// Allowed image MIME types — used by both fileFilter (declared type) and magic byte validation (real type)
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// All uploads go to memory — files are streamed directly to Supabase Storage
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// POST /api/uploads/images - Upload multiple images
router.post(
  '/images',
  authenticateToken,
  upload.array('images', 10), // Max 10 images per upload
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      // Magic byte validation — fileFilter only checked the declared MIME type
      for (const file of files) {
        const detected = await fileTypeFromBuffer(file.buffer);
        if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
          res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' });
          return;
        }
      }

      // Upload all files to Supabase Storage
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          const ext = path.extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;

          const { error } = await supabase.storage
            .from('images')
            .upload(filename, file.buffer, { contentType: file.mimetype });

          if (error) throw new Error(`Supabase upload failed: ${error.message}`);

          const { data } = supabase.storage.from('images').getPublicUrl(filename);

          return {
            filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: data.publicUrl,
          };
        }),
      );

      res.status(201).json({
        message: 'Files uploaded successfully',
        files: uploadedFiles,
      });
    } catch (err) {
      logger.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  },
);

// DELETE /api/uploads/images/:filename - Delete an uploaded image
router.delete('/images/:filename', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename as string;
    if (!filename || Array.isArray(filename)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    // Security: Ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const userId = req.userId!;

    // Reconstruct the Supabase CDN URL to match what's stored in the DB
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename);
    const fileUrl = urlData.publicUrl;

    // Ownership check: verify this file belongs to the requesting user
    const db = await getPool();
    const owned = await db.maybeOne(
      sql.type(z.object({ media_id: z.number() }))`
        SELECT pm.media_id
        FROM post_media pm
        JOIN posts p ON pm.post_id = p.post_id
        WHERE pm.url = ${fileUrl} AND p.account_id = ${userId}
        UNION ALL
        SELECT prm.media_id
        FROM profile_media prm
        JOIN profiles pr ON prm.profile_id = pr.profile_id
        WHERE prm.url = ${fileUrl} AND pr.account_id = ${userId}
        LIMIT 1
      `,
    );

    if (!owned) {
      res.status(403).json({ error: 'You do not have permission to delete this file' });
      return;
    }

    const { error } = await supabase.storage.from('images').remove([filename]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);

    res.status(204).send();
  } catch (err) {
    logger.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST /api/uploads/avatar - Upload and resize avatar to 400x400px
router.post(
  '/avatar',
  authenticateToken,
  (req: Request, res: Response, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'Image must be under 5MB' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      } else if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Magic byte validation — fileFilter only checked the declared MIME type
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
        res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' });
        return;
      }

      // Generate unique filename — always WebP after Sharp processing
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const filename = `${uniqueSuffix}.webp`;

      // Resize to 400x400px and convert to WebP
      const processedBuffer = await sharp(file.buffer)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filename, processedBuffer, { contentType: 'image/webp' });

      if (error) throw new Error(`Supabase upload failed: ${error.message}`);

      const { data } = supabase.storage.from('avatars').getPublicUrl(filename);

      res.status(201).json({
        message: 'Avatar uploaded successfully',
        file: {
          filename,
          originalName: file.originalname,
          size: processedBuffer.length,
          url: data.publicUrl,
        },
      });
    } catch (err) {
      logger.error('Avatar upload error:', err);
      res.status(500).json({ error: 'Failed to process avatar' });
    }
  },
);

// DELETE /api/uploads/avatar/:filename - Delete an avatar
router.delete('/avatar/:filename', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename as string;
    if (!filename || Array.isArray(filename)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    // Security: Ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const userId = req.userId!;

    // Reconstruct the Supabase CDN URL to match what's stored in the DB
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
    const fileUrl = urlData.publicUrl;

    // Ownership check: avatars are stored in account_media or profile_media
    const db = await getPool();
    const owned = await db.maybeOne(
      sql.type(z.object({ media_id: z.number() }))`
        SELECT am.media_id
        FROM account_media am
        WHERE am.url = ${fileUrl} AND am.account_id = ${userId}
        UNION ALL
        SELECT prm.media_id
        FROM profile_media prm
        JOIN profiles pr ON prm.profile_id = pr.profile_id
        WHERE prm.url = ${fileUrl} AND pr.account_id = ${userId}
        LIMIT 1
      `,
    );

    if (!owned) {
      res.status(403).json({ error: 'You do not have permission to delete this avatar' });
      return;
    }

    const { error } = await supabase.storage.from('avatars').remove([filename]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);

    res.status(204).send();
  } catch (err) {
    logger.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

export default router;
