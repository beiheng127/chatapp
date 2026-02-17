// backend/src/controllers/roomMessageController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RoomMessage from '../models/RoomMessage';
import Room from '../models/Room';

// 复用 auth.ts 中扩展的 Request 类型（req.user 为可选属性）

// 定义请求体/查询参数类型
interface SendRoomMessageBody {
  content: string;
  type?: 'text' | 'image' | 'file' | 'system';
  replyTo?: string;
}

interface RoomMessagesQuery {
  limit?: string;
  before?: string;
  after?: string;
}

// 发送群聊消息
export const sendRoomMessage = async (req: Request, res: Response): Promise<void> => {
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
    const { roomId } = req.params;
    const { content, type = 'text', replyTo } = req.body as SendRoomMessageBody;

    // 2. 基础参数校验
    if (!roomId || !content) {
      res.status(400).json({
        success: false,
        message: '群聊ID和消息内容不能为空'
      });
      return;
    }

    // 3. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }
    if (replyTo && !mongoose.Types.ObjectId.isValid(replyTo)) {
      res.status(400).json({ success: false, message: '无效的回复消息ID' });
      return;
    }

    // 4. 检查群聊是否存在
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 5. 检查是否是群成员（兼容 populate 前后的字段格式）
    const isMember = room.members.some(member => 
      member._id ? member._id.toString() === senderId : member.toString() === senderId
    );
    if (!isMember) {
      res.status(403).json({
        success: false,
        message: '只有群成员可以发送消息'
      });
      return;
    }

    // 6. 创建消息（显式转换为 ObjectId）
    const message = new RoomMessage({
      room: new mongoose.Types.ObjectId(roomId),
      sender: new mongoose.Types.ObjectId(senderId),
      content,
      type,
      replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : undefined,
      readBy: [new mongoose.Types.ObjectId(senderId)] // 发送者已读
    });

    await message.save();

    // 7. 填充关联信息
    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar' }
      });
    }

    // 8. 更新群聊的更新时间
    room.updatedAt = new Date(); // 简化写法（等价于 set 方法）
    await room.save();

    // WebSocket 广播给群成员（预留接口）
    // broadcastRoomMessage(roomId, message);

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });

  } catch (error: unknown) { // 修复：any → unknown
    console.error('发送群聊消息错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取群聊消息历史
export const getRoomMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. 校验用户认证状态
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户，请先登录' });
      return;
    }
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { limit = '50', before, after } = req.query as RoomMessagesQuery;

    // 2. 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
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

    // 4. 检查群聊是否存在
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 5. 检查是否是群成员
    const isMember = room.members.some(member => 
      member._id ? member._id.toString() === userId : member.toString() === userId
    );
    if (!isMember) {
      res.status(403).json({
        success: false,
        message: '只有群成员可以查看消息'
      });
      return;
    }

    // 6. 构建查询条件（移除 any，使用 Mongoose 内置类型）
    const query: mongoose.FilterQuery<typeof RoomMessage> = { 
      room: new mongoose.Types.ObjectId(roomId) 
    };

    // 7. 处理时间筛选（增强日期校验）
    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        res.status(400).json({ success: false, message: '无效的 before 日期格式，请传入 ISO 格式时间' });
        return;
      }
      query.createdAt = { $lt: beforeDate };
    }
    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate.getTime())) {
        res.status(400).json({ success: false, message: '无效的 after 日期格式，请传入 ISO 格式时间' });
        return;
      }
      // 兼容 before/after 同时存在的场景
      query.createdAt = query.createdAt 
        ? { ...query.createdAt, $gt: afterDate } 
        : { $gt: afterDate };
    }

    // 8. 查询消息并排序
    const messages = await RoomMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('sender', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar' }
      });

    // 9. 标记消息为已读（批量更新，优化性能）
    if (messages.length > 0) {
      const messageIds = messages.map(msg => msg._id);
      await RoomMessage.updateMany(
        {
          _id: { $in: messageIds },
          readBy: { $nin: [new mongoose.Types.ObjectId(userId)] } // 修复：$ne → $nin（数组匹配）
        },
        {
          $addToSet: { readBy: new mongoose.Types.ObjectId(userId) }
        }
      );
    }

    // 10. 按时间升序返回
    res.json({
      success: true,
      data: messages.reverse()
    });

  } catch (error: unknown) {
    console.error('获取群聊消息错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 删除消息（只能删除自己的消息）
export const deleteRoomMessage = async (req: Request, res: Response): Promise<void> => {
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

    // 3. 查找消息
    const message = await RoomMessage.findById(messageId);
    if (!message) {
      res.status(404).json({
        success: false,
        message: '消息不存在'
      });
      return;
    }

    // 4. 检查是否是消息发送者
    if (message.sender.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: '只能删除自己发送的消息'
      });
      return;
    }

    // 5. 软删除：替换内容并标记为系统消息
    message.content = '消息已删除';
    message.type = 'system';
    await message.save();

    res.json({
      success: true,
      message: '消息已删除',
      data: { messageId: message._id } // 返回额外信息
    });

  } catch (error: unknown) {
    console.error('删除消息错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};