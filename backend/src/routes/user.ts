// backend/src/routes/user.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  searchUsers,
  getUserById,
  getOnlineUsers
} from '../controllers/userController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/search', searchUsers);
router.get('/online', getOnlineUsers);
router.get('/:userId', getUserById);

export default router;