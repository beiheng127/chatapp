// backend/src/routes/roomUpload.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import { uploadRoomAvatar } from '../controllers/roomUploadController';

const router = express.Router();

// 需要认证
router.use(authenticate);
router.post('/:roomId/avatar', uploadRoomAvatar);

export default router;