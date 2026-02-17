// backend/src/routes/roomMessage.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendRoomMessage,
  getRoomMessages,
  deleteRoomMessage
} from '../controllers/roomMessageController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

router.post('/:roomId/send', sendRoomMessage);
router.get('/:roomId/messages', getRoomMessages);
router.delete('/message/:messageId', deleteRoomMessage);

export default router;