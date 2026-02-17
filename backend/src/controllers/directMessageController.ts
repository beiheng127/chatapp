// backend/src/controllers/directMessageController.ts
import { Request, Response } from 'express';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';
import mongoose from 'mongoose';

// 复用 auth.ts 中已扩展的 Request 类型（避免重复声明）
// 注意：auth.ts 中 req.user 是可选属性（user?: { userId: string }），需先校验存在性

// 定义请求体类型
interface SendDirectMessageBody {
  receiverId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
}

// 定义查询参数类型
interface ConversationQuery {
  limit?: string;
  before?: string;
}

// 定义聚合结果类型（对话列表）
interface ConversationAggregateResult {
  _id: mongoose.Types.ObjectId;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  user: {
    username: string;
    avatar?: string;
  };
}

// 发送私聊消息
export const sendDirectMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态（兼容 auth.ts 的可选 user 类型）
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: '未认证的用户，请先登录'
      });
      return;
    }
    const senderId = req.user.userId;
    const { receiverId, content, type = 'text' } = req.body as SendDirectMessageBody;

    // 2. 基础参数校验
    if (!receiverId || !content) {
      res.status(400).json({
        success: false,
        message: '接收者ID和消息内容不能为空'
      });
      return;
    }

    // 3. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      res.status(400).json({ success: false, message: '无效的发送者ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      res.status(400).json({ success: false, message: '无效的接收者ID' });
      return;
    }

    // 4. 禁止给自己发消息
    if (senderId === receiverId) {
      res.status(400).json({
        success: false,
        message: '不能给自己发送消息'
      });
      return;
    }

    // 5. 检查接收者是否存在
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 6. 创建并保存消息
    const message = new DirectMessage({
      sender: new mongoose.Types.ObjectId(senderId),
      receiver: new mongoose.Types.ObjectId(receiverId),
      content,
      type,
      read: false, // 显式设置未读状态（补充缺失的字段）
      readAt: null
    });

    await message.save();

    // 7. 填充发送者信息（指定返回字段）
    await message.populate({
      path: 'sender',
      select: 'username email avatar'
    });

    // WebSocket 广播给接收者（预留接口）
    // broadcastDirectMessage(receiverId, message);

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });

  } catch (error: unknown) { // 修复：any → unknown
    console.error('发送私聊消息错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取与指定用户的对话
export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户，请先登录' });
      return;
    }
    const currentUserId = req.user.userId;
    const { userId: targetUserId } = req.params;
    const { limit = '50', before } = req.query as ConversationQuery;

    // 2. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      res.status(400).json({ success: false, message: '无效的当前用户ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: '无效的对话用户ID' });
      return;
    }

    // 3. 校验分页参数
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        message: '无效的分页参数，limit 需为 1-100 之间的数字'
      });
      return;
    }

    // 4. 转换为 ObjectId
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    const targetUserObjectId = new mongoose.Types.ObjectId(targetUserId);

    // 5. 构建查询条件（移除 any，使用 Mongoose 内置类型）
    const query: mongoose.FilterQuery<typeof DirectMessage> = {
      $or: [
        { sender: currentUserObjectId, receiver: targetUserObjectId },
        { sender: targetUserObjectId, receiver: currentUserObjectId }
      ]
    };

    // 6. 处理 before 时间筛选（增强日期校验）
    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        res.status(400).json({ success: false, message: '无效的 before 日期格式，请传入 ISO 格式时间' });
        return;
      }
      query.createdAt = { $lt: beforeDate };
    }

    // 7. 查询消息并排序
    const messages = await DirectMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');

    // 8. 按时间升序返回（修复空数组 reverse 无影响）
    res.json({
      success: true,
      data: messages.reverse()
    });

  } catch (error: unknown) {
    console.error('获取对话错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取当前用户的所有对话列表
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户，请先登录' });
      return;
    }
    const userId = req.user.userId;

    // 2. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 3. 聚合查询（添加类型定义 + 优化逻辑）
    const conversations = await DirectMessage.aggregate<ConversationAggregateResult>([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { receiver: userObjectId }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiver', userObjectId] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          // 只返回需要的字段，减少数据传输
          pipeline: [{ $project: { username: 1, avatar: 1, _id: 0 } }]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, // 兼容用户被删除的场景
      {
        $project: {
          userId: '$_id',
          username: { $ifNull: ['$user.username', '未知用户'] }, // 兜底处理
          avatar: '$user.avatar',
          lastMessage: 1,
          lastMessageTime: 1,
          unreadCount: 1
        }
      },
      { $sort: { lastMessageTime: -1 } }
    ]);

    res.json({
      success: true,
      data: conversations
    });

  } catch (error: unknown) {
    console.error('获取对话列表错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 标记消息为已读
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户，请先登录' });
      return;
    }
    const userId = req.user.userId;
    const { messageId } = req.params;

    // 2. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      res.status(400).json({ success: false, message: '无效的消息ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }

    // 3. 查找并更新消息（确保接收者是当前用户）
    const message = await DirectMessage.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(messageId),
        receiver: new mongoose.Types.ObjectId(userId),
        read: false
      },
      {
        read: true,
        readAt: new Date()
      },
      { new: true } // 返回更新后的文档
    );

    // 4. 处理未找到的情况
    if (!message) {
      res.status(404).json({
        success: false,
        message: '消息不存在或已标记为已读'
      });
      return;
    }

    res.json({
      success: true,
      message: '消息已标记为已读',
      data: { messageId: message._id, readAt: message.readAt } // 返回额外信息
    });

  } catch (error: unknown) {
    console.error('标记已读错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 批量标记消息为已读
export const markMultipleAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户，请先登录' });
      return;
    }
    const userId = req.user.userId;
    const { messageIds } = req.body;

    // 2. 校验参数
    if (!Array.isArray(messageIds)) {
      res.status(400).json({ success: false, message: '消息ID列表格式错误' });
      return;
    }

    // 3. 转换ID格式
    const validObjectIds = messageIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (validObjectIds.length === 0) {
      res.status(400).json({ success: false, message: '没有有效的消息ID' });
      return;
    }

    // 4. 批量更新消息状态
    const result = await DirectMessage.updateMany(
      {
        _id: { $in: validObjectIds },
        receiver: new mongoose.Types.ObjectId(userId),
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: '消息已标记为已读',
      data: { marked: result.modifiedCount }
    });

  } catch (error: unknown) {
    console.error('批量标记已读错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};