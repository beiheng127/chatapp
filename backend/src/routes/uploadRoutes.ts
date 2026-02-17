// backend/src/routes/uploadRoute.ts
import { Router } from 'express';
import {
  uploadAvatar,
  uploadMessageImage,
  uploadMessageFile,
  uploadFile,
  uploadMultipleFiles
} from '../controllers/uploadController';
import { authenticate } from '../middleware/auth'; // 引入你的登录验证中间件

const router = Router();

// 所有上传接口都需要认证
router.use(authenticate);

// 用户头像上传
router.post('/avatar', uploadAvatar);

// 消息图片上传
router.post('/message/image', uploadMessageImage);

// 消息文件上传
router.post('/message/file', uploadMessageFile);

// 通用文件上传（通过type参数指定类型）
router.post('/file', uploadFile);

// 批量文件上传
router.post('/multiple', uploadMultipleFiles);
export default router;