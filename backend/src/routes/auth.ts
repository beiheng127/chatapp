// backend/src/routes/auth.ts
import express from 'express';
import { 
  register, 
  login, 
  logout,
  getProfile,
  getOnlineUsers,
  updateProfile,
  sendVerificationCode,
  changePassword,
  getSessions,
  revokeSession
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRegister, validateLogin } from '../middleware/validators/authValidator';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @description 用户注册接口
 * @access 公开
 */
router.post('/register', validateRegister, register);

/**
 * @route POST /api/auth/login
 * @description 用户登录接口
 * @access 公开
 */
router.post('/login', validateLogin, login);

/**
 * @route POST /api/auth/logout
 * @description 用户登出接口
 * @access 需要认证
 */
router.post('/logout', authenticate, logout);

/**
 * @route GET /api/auth/profile
 * @description 获取当前用户信息
 * @access 需要认证
 */
router.get('/profile', authenticate, getProfile);


router.put('/profile', authenticate, updateProfile); 

/**
 * @route POST /api/auth/send-code
 * @description 发送验证码
 * @access 公开/需认证
 */
router.post('/send-code', authenticate, sendVerificationCode);

/**
 * @route POST /api/auth/change-password
 * @description 修改密码
 * @access 公开/需认证
 */
router.post('/change-password', authenticate, changePassword);

/**
 * @route GET /api/auth/sessions
 * @description 获取活动会话
 * @access 需认证
 */
router.get('/sessions', authenticate, getSessions);

/**
 * @route DELETE /api/auth/sessions/:sessionId
 * @description 移除会话
 * @access 需认证
 */
router.delete('/sessions/:sessionId', authenticate, revokeSession);

/**
 * @route GET /api/auth/online-users
 * @description 获取在线用户列表
 * @access 需要认证
 */
router.get('/online-users', authenticate, getOnlineUsers);

export default router;