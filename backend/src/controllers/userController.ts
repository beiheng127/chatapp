// backend/src/controllers/userController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';

// 复用 auth.ts 中扩展的 Request 类型（req.user 为可选属性）

// 定义查询参数类型
interface SearchUsersQuery {
  query?: string;
  limit?: string;
}

// 搜索用户
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态（兼容 auth.ts 的可选 user 类型）
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: '未认证的用户，请先登录'
      });
      return;
    }
    const currentUserId = req.user.userId;
    const { query: searchQuery, limit = '20' } = req.query as SearchUsersQuery;

    // 2. 校验搜索关键词
    if (!searchQuery || searchQuery.trim() === '') {
      res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
      return;
    }

    // 3. 校验ID格式和分页参数
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      res.status(400).json({ success: false, message: '无效的当前用户ID' });
      return;
    }
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        message: '无效的分页参数，limit 需为 1-100 之间的数字'
      });
      return;
    }

    const trimmedQuery = searchQuery.trim();
    
    // 4. 构建搜索条件（移除 any，使用 Mongoose 内置类型）
    const searchConditions: mongoose.FilterQuery<typeof User>[] = [
      { username: { $regex: trimmedQuery, $options: 'i' } },
      { email: { $regex: trimmedQuery, $options: 'i' } },
    ];

    // 5. 搜索用户，排除当前用户
    const users = await User.find({
      $and: [
        { $or: searchConditions },
        { _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } } // 显式转换为 ObjectId
      ]
    })
    .select('username email avatar isOnline lastSeen')
    .limit(limitNum)
    .sort({ isOnline: -1, username: 1 });

    // 6. 格式化返回数据（类型安全）
    res.json({
      success: true,
      data: users.map(user => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '', // 兜底空头像
        isOnline: user.isOnline || false, // 兜底在线状态
        lastSeen: user.lastSeen || null
      }))
    });

  } catch (error: unknown) { // 修复：any → unknown
    console.error('搜索用户错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取用户详情
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // 1. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }

    // 2. 查询用户详情
    const user = await User.findById(new mongoose.Types.ObjectId(userId))
      .select('username email avatar isOnline lastSeen createdAt');

    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 3. 格式化返回数据（兜底空值）
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '',
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen || null,
        createdAt: user.createdAt
      }
    });

  } catch (error: unknown) {
    console.error('获取用户详情错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取在线用户列表
export const getOnlineUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态（获取在线用户也需要登录）
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: '未认证的用户，请先登录'
      });
      return;
    }

    // 2. 查询在线用户（优化查询条件）
    const users = await User.find({ isOnline: true })
      .select('username avatar isOnline lastSeen')
      .limit(50)
      .sort({ lastSeen: -1 });

    // 3. 格式化返回数据（兜底空值）
    res.json({
      success: true,
      data: users.map(user => ({
        _id: user._id,
        username: user.username,
        avatar: user.avatar || '',
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen || null
      }))
    });

  } catch (error: unknown) {
    console.error('获取在线用户错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};