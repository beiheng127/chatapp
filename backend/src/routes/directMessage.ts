// backend/src/routes/directMessage.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendDirectMessage,
  getConversation,
  getConversations,
  markAsRead,
  markMultipleAsRead
} from '../controllers/directMessageController';

const router = express.Router();

// 所有私聊路由都需要认证
router.use(authenticate);

router.post('/send', sendDirectMessage);
router.get('/conversations', getConversations);
router.get('/conversation/:userId', getConversation);
router.put('/read/:messageId', markAsRead);
router.post('/read-multiple', markMultipleAsRead);


export default router;