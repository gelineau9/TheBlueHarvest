// /apps/backend/src/routes/uploads.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Backend URL for serving uploaded files
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-randomstring.extension
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

// Configure multer with 10MB limit for high-res images
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Configure multer for avatar uploads (5MB limit, uses memory storage for processing)
const avatarStorage = multer.memoryStorage();

const avatarFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed (JPG, PNG, GIF, WEBP)'));
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// POST /api/uploads/images - Upload multiple images
router.post(
  '/images',
  authenticateToken,
  upload.array('images', 10), // Max 10 images per upload
  (req: Request, res: Response): void => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      // Return array of uploaded file info
      const uploadedFiles = files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: `${BACKEND_URL}/uploads/images/${file.filename}`,
      }));

      res.status(201).json({
        message: 'Files uploaded successfully',
        files: uploadedFiles,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  },
);

// DELETE /api/uploads/images/:filename - Delete an uploaded image
router.delete('/images/:filename', authenticateToken, (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename as string;
    if (!filename || Array.isArray(filename)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const filePath = path.join(imagesDir, filename);

    // Security: Ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
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

      // Generate unique filename
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const filename = `${uniqueSuffix}.webp`; // Always output as WebP for optimization
      const outputPath = path.join(avatarsDir, filename);

      // Resize to 400x400px and optimize with sharp
      await sharp(file.buffer)
        .resize(400, 400, {
          fit: 'cover', // Crop to fill 400x400
          position: 'center',
        })
        .webp({ quality: 85 }) // Convert to WebP for smaller file size
        .toFile(outputPath);

      // Get the final file size
      const stats = fs.statSync(outputPath);

      res.status(201).json({
        message: 'Avatar uploaded successfully',
        file: {
          filename: filename,
          originalName: file.originalname,
          size: stats.size,
          url: `${BACKEND_URL}/uploads/avatars/${filename}`,
        },
      });
    } catch (err) {
      console.error('Avatar upload error:', err);
      res.status(500).json({ error: 'Failed to process avatar' });
    }
  },
);

// DELETE /api/uploads/avatar/:filename - Delete an avatar
router.delete('/avatar/:filename', authenticateToken, (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename as string;
    if (!filename || Array.isArray(filename)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const filePath = path.join(avatarsDir, filename);

    // Security: Ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ message: 'Avatar deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

export default router;
