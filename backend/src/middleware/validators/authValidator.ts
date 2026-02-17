// backend/src/middleware/validators/authValidator.ts
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 20 }).withMessage('用户名长度必须在3-20个字符之间')
    .trim()
    .escape(),
  body('email')
    .isEmail().withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('密码长度至少为6个字符')
    .matches(/\d/).withMessage('密码必须包含至少一个数字'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: '请求参数验证失败',
        errors: errors.array().map((err) => {
          // 仅移除 any，保留你的原始逻辑
          return {
            field: (err as { param?: string }).param || 'unknown',
            msg: err.msg
          };
        })
      });
    }
    next();
  }
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: '请求参数验证失败',
        errors: errors.array()
      });
    }
    next();
  }
];