// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      // 这里的字段要和你中间件挂载的 user 字段一致（比如 userId、username 等）
      user?: {
        userId: string; // 对应你代码中的 req.user?.userId
        // 可添加其他字段，如：username?: string; role?: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. 从请求头中获取令牌
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供认证令牌'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 2. 验证令牌（新增密钥校验）
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET 环境变量未配置');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload & { userId: string };

    // 3. 附加用户信息到 req.user（此时 req.user 已被全局类型扩展识别）
    req.user = { userId: decoded.userId };

    next();
  } catch (error) {
    console.error('Token 验证失败:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: '无效的令牌' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: '令牌已过期，请重新登录' });
      return;
    }
    if (error instanceof Error && error.message === 'JWT_SECRET 环境变量未配置') {
      res.status(500).json({ success: false, message: '服务器配置错误' });
      return;
    }

    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};