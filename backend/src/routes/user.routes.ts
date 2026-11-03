import {Router} from 'express';
import {changePassword,
                   getProfile,
                   updateProfile
} from '../controllers/user.controller.js';
import {authMiddleware} from '../middleware/auth.middleware.js'

const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get('/me', getProfile);
userRouter.patch ('/me',updateProfile);
userRouter.patch ('/me/password', changePassword);


export default userRouter;