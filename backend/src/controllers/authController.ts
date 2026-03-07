// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import VerificationCode from '../models/VerificationCode';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = '7d';

// 邮件发送配置
const sendEmail = async (to: string, subject: string, html: string) => {
  // 如果配置了SMTP，使用SMTP发送
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Chat App" <noreply@chatapp.com>',
      to,
      subject,
      html,
    });
  } else {
    // 开发环境：仅打印到控制台
    console.log('==================================================');
    console.log(`[Email Simulation] To: ${to}`);
    console.log(`[Email Simulation] Subject: ${subject}`);
    console.log(`[Email Simulation] Content: ${html}`);
    console.log('==================================================');
  }
};

// 生成 JWT Token
const generateToken = (userId: string, sessionId?: string): string => {
  return jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 用户注册
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: '请提供完整的注册信息'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const message = existingUser.email === email
        ? '邮箱已被注册'
        : '用户名已被使用';
      
      res.status(409).json({
        success: false,
        message
      });
      return;
    }

    const user = new User({
      username,
      email,
      password
    });
    
    // 注册时创建一个默认会话
    const sessionId = uuidv4();
    user.sessions = [{
      sessionId,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      lastActive: new Date(),
      deviceType: 'web'
    }];
    
    await user.save();

    const token = generateToken(user._id.toString(), sessionId);
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: userResponse
      }
    });
  } catch (error: unknown) {
    console.error('注册错误:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((err) => {
        return (err as { message: string }).message;
      });
      res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 用户登录
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }

    // 创建新会话
    const sessionId = uuidv4();
    const newSession = {
      sessionId,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      lastActive: new Date(),
      deviceType: 'web' // 可以根据 User-Agent 解析更详细的设备类型
    };

    if (!user.sessions) {
      user.sessions = [];
    }
    user.sessions.push(newSession);
    
    // 限制最大会话数，防止无限增长
    if (user.sessions.length > 10) {
      // 移除最早的会话，保留最近的10个
      user.sessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
      user.sessions = user.sessions.slice(0, 10);
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id.toString(), sessionId);
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline
    };

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: userResponse
      }
    });
  } catch (error: unknown) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
};

// 获取当前用户信息
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen
        }
      }
    });
  } catch (error: unknown) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 发送验证码（用于修改密码）
export const sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    // 这里允许未登录用户发送（忘记密码）或已登录用户发送
    // 如果已登录，优先使用当前用户邮箱
    let email = req.body.email;
    const userId = req.user?.userId;

    if (userId && !email) {
      const user = await User.findById(userId);
      if (user) {
        email = user.email;
      }
    }

    if (!email) {
      res.status(400).json({ success: false, message: '请输入邮箱' });
      return;
    }

    // 检查用户是否存在
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: '该邮箱未注册' });
      return;
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 保存验证码
    await VerificationCode.create({
      email,
      code,
      type: 'change_password',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期
    });

    // 发送邮件
    const html = `
      <div style="padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333;">修改密码验证</h2>
          <p>您正在申请修改密码，请使用以下验证码完成操作：</p>
          <div style="background-color: #f0f4f8; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">该验证码将在10分钟后失效。如果这不是您本人的操作，请忽略此邮件。</p>
        </div>
      </div>
    `;

    await sendEmail(email, '修改密码验证码', html);

    res.json({ success: true, message: '验证码已发送至您的邮箱' });
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({ success: false, message: '发送验证码失败' });
  }
};

// 验证代码并修改密码
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;
    const userId = req.user?.userId;

    // 确定邮箱
    let targetEmail = email;
    if (userId && !targetEmail) {
      const currentUser = await User.findById(userId);
      if (currentUser) {
        targetEmail = currentUser.email;
      }
    }

    if (!targetEmail || !code || !newPassword) {
      res.status(400).json({ success: false, message: '请提供完整信息' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: '新密码长度至少需要6位' });
      return;
    }

    // 验证验证码
    const validCode = await VerificationCode.findOne({
      email: targetEmail,
      code,
      type: 'change_password',
      expiresAt: { $gt: new Date() } // 未过期
    }).sort({ createdAt: -1 }); // 取最新的一个

    if (!validCode) {
      res.status(400).json({ success: false, message: '验证码无效或已过期' });
      return;
    }

    // 更新密码
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    user.password = newPassword; // Mongoose中间件会处理加密
    await user.save();

    // 删除验证码（防止复用）
    await VerificationCode.deleteOne({ _id: validCode._id });

    // 可选：修改密码后是否需要注销所有设备？
    // 这里我们可以选择保留当前会话，或者强制下线。
    // 为了安全，建议强制下线其他设备，或者全部下线。
    // user.sessions = []; await user.save();

    res.json({ success: true, message: '密码修改成功，请重新登录' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
};

// 获取当前活动会话
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.sessions) {
      res.json({ success: true, data: [] });
      return;
    }

    // 标记当前会话
    // 注意：JWT payload 需要包含 sessionId 才能精确匹配
    // 这里我们假设 req.user 可能没有 sessionId (如果使用的是旧token)
    // 但如果有，我们可以标记
    const currentSessionId = (req.user as any).sessionId;

    const sessions = user.sessions.map(session => ({
      id: session.sessionId,
      ip: session.ip,
      userAgent: session.userAgent,
      lastActive: session.lastActive,
      deviceType: session.deviceType,
      isCurrent: session.sessionId === currentSessionId
    }));

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('获取会话列表错误:', error);
    res.status(500).json({ success: false, message: '获取会话列表失败' });
  }
};

// 移除会话（踢出设备）
export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.sessions) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const initialLength = user.sessions.length;
    user.sessions = user.sessions.filter(s => s.sessionId !== sessionId);

    if (user.sessions.length === initialLength) {
      res.status(404).json({ success: false, message: '会话不存在' });
      return;
    }

    await user.save();

    res.json({ success: true, message: '设备已移除' });
  } catch (error) {
    console.error('移除会话错误:', error);
    res.status(500).json({ success: false, message: '移除会话失败' });
  }
};

// 用户登出
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (userId) {
       const user = await User.findById(userId);
       if (user) {
         user.isOnline = false;
         user.lastSeen = new Date();
         // 移除当前会话
         const currentSessionId = (req.user as any).sessionId;
         if (currentSessionId && user.sessions) {
            user.sessions = user.sessions.filter(s => s.sessionId !== currentSessionId);
         }
         await user.save();
       }
    }
    res.status(200).json({ success: true, message: '登出成功' });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({ success: false, message: '登出失败' });
  }
};

// 获取在线用户
export const getOnlineUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ isOnline: true }).select('username avatar email isOnline lastSeen');
    res.json({ success: true, data: users });
  } catch (error) {
     console.error('获取在线用户错误:', error);
     res.status(500).json({ success: false, message: '获取在线用户失败' });
  }
};

// 更新个人资料
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { username, bio, avatar, settings } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ success: false, message: '用户不存在' });
        return;
    }

    if (username) {
      // 检查用户名是否重复
      const existing = await User.findOne({ username, _id: { $ne: userId } });
      if (existing) {
        res.status(409).json({ success: false, message: '用户名已被使用' });
        return;
      }
      user.username = username;
    }
    
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;
    if (settings) {
      user.settings = user.settings ? { ...user.settings, ...settings } : settings;
    }

    await user.save();
    
    res.json({ 
      success: true, 
      message: '个人资料已更新', 
      data: { 
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          settings: user.settings
        } 
      } 
    });
  } catch (error) {
    console.error('更新资料错误:', error);
    res.status(500).json({ success: false, message: '更新资料失败' });
  }
};
