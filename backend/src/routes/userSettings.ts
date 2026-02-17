// backend/src/routes/userSettings.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserSettings,
  updateUserSettings,
  resetUserSettings
} from '../controllers/userSettingsController';

const router = express.Router();

// 所有设置路由都需要认证
router.use(authenticate);

// 获取用户设置
router.get('/user/settings', getUserSettings);

// 更新用户设置
router.put('/user/settings', updateUserSettings);

// 重置用户设置
router.post('/user/settings/reset', resetUserSettings);

export default router;