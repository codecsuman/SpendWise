import {Router} from 'express';
import multer from 'multer';
import {changePassword,
                   getProfile,
                   updateAvatar,
                   updateProfile
} from '../controllers/user.controller.js';
import {authMiddleware} from '../middleware/auth.middleware.js'
import { AppError } from '../utils/AppError.js';

const userRouter = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
}).single('file');

userRouter.use(authMiddleware);

userRouter.get('/me', getProfile);
userRouter.patch ('/me',updateProfile);
userRouter.patch ('/me/password', changePassword);

// Require a session before reading the multipart body.
userRouter.post('/me/avatar', (req, res, next) => {
  avatarUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photos must be 5 MB or smaller'
        : 'Upload one profile photo';
      next(new AppError(message, 400));
      return;
    }
    next(error);
  });
}, updateAvatar);

export default userRouter;
