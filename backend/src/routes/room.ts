// backend/src/routes/room.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createRoom,
  getUserRooms,
  getPublicRooms,
  joinRoom,
  leaveRoom,
  getRoomDetails,
  updateRoom,
  inviteToRoom,
  deleteRoom,
  removeMember,
  toggleAdmin
} from '../controllers/roomController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

router.post('/create', createRoom);
router.get('/my-rooms', getUserRooms);
router.get('/public', getPublicRooms);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);
router.get('/:roomId', getRoomDetails);
router.put('/:roomId', updateRoom);
router.post('/:roomId/invite', inviteToRoom);
router.delete('/:roomId', deleteRoom);
router.delete('/:roomId/members/:userId', removeMember);
router.patch('/:roomId/admins/:userId', toggleAdmin);

export default router;