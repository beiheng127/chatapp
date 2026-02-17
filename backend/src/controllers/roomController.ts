import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Room from '../models/Room';
import RoomMessage from '../models/RoomMessage';
import User from '../models/User';

// 复用 auth.ts 中已扩展的 Request 类型（避免重复声明）
// 注意：auth.ts 中 req.user 是可选的（user?: { userId: string }），需先校验存在性

// 定义查询参数类型
interface PublicRoomsQuery {
  page?: string;
  limit?: string;
  search?: string;
}

// 定义创建/更新房间的请求体类型
interface CreateRoomBody {
  name: string;
  description?: string;
  isPrivate?: boolean;
  type?: 'group' | 'channel';
  memberIds?: string[];
}

interface UpdateRoomBody {
  name?: string;
  description?: string;
  avatar?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

interface InviteToRoomBody {
  userIds: string[];
}

// 创建群聊
export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    // 校验用户信息（auth 中间件确保 req.user 存在，此处兜底）
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const creatorId = req.user.userId;
    const { name, description, isPrivate, type, memberIds } = req.body as CreateRoomBody;

    // 校验必填项
    if (!name) {
      res.status(400).json({ success: false, message: '群聊名称不能为空' });
      return;
    }

    // 检查群名是否已存在
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      res.status(400).json({
        success: false,
        message: '群聊名称已存在'
      });
      return;
    }

    // 校验 memberIds 格式（如果有）
    const validMemberIds = (memberIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));
    const memberObjectIds = validMemberIds.map(id => new mongoose.Types.ObjectId(id));
    // 确保创建者在成员列表中
    const allMembers = [new mongoose.Types.ObjectId(creatorId), ...memberObjectIds];

    // 创建群聊
    const room = new Room({
      name,
      description: description || '',
      isPrivate: isPrivate || false,
      type: type || 'group',
      creator: creatorId,
      members: allMembers,
      adminMembers: [new mongoose.Types.ObjectId(creatorId)]
    });

    await room.save();

    // 发送系统消息
    const systemMessage = new RoomMessage({
      room: room._id,
      sender: creatorId,
      content: '群聊已创建',
      type: 'system'
    });
    await systemMessage.save();

    res.status(201).json({
      success: true,
      message: '群聊创建成功',
      data: room
    });

  } catch (error: unknown) { // 修复：any → unknown
    console.error('创建群聊错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取用户加入的群聊
export const getUserRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const userId = req.user.userId;

    // 校验用户ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }

    const rooms = await Room.find({
      members: new mongoose.Types.ObjectId(userId)
    })
    .populate('creator', 'username avatar')
    .populate('members', 'username avatar isOnline')
    .populate('adminMembers', 'username avatar')
    .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: rooms
    });

  } catch (error: unknown) {
    console.error('获取群聊列表错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取公开群聊
export const getPublicRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const userId = req.user.userId;
    const { page = '1', limit = '20', search } = req.query as PublicRoomsQuery;

    // 校验分页参数
    const pageNum = Number(page);
    const limitNum = Number(limit);
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      res.status(400).json({ success: false, message: '无效的分页参数' });
      return;
    }

    // 修复：移除 any，使用 Mongoose FilterQuery
    const query: mongoose.FilterQuery<typeof Room> = { 
      isPrivate: false,  // 确保这里只查询公开的聊天室
      type: 'group'      // 只显示群聊，不显示频道（如果需要）
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 移除排除已加入群聊的逻辑，让用户能看到所有公开群聊
    /*
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }
    const userRooms = await Room.find({ members: new mongoose.Types.ObjectId(userId) }).select('_id');
    const userRoomIds = userRooms.map(room => room._id);
    if (userRoomIds.length > 0) {
      query._id = { $nin: userRoomIds };
    }
    */

    const rooms = await Room.find(query)
      .populate('creator', 'username avatar')
      .populate('members', 'username avatar')
      .populate('adminMembers', 'username avatar')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Room.countDocuments(query);

    res.json({
      success: true,
      data: {
        data: rooms,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error: unknown) {
    console.error('获取公开群聊错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 加入群聊
export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId } = req.params;
    const userId = req.user.userId;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 检查是否已经是成员
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const isMember = room.members.some(member => 
      member._id ? member._id.toString() === userId : member.toString() === userId
    );
    if (isMember) {
      res.status(400).json({
        success: false,
        message: '已经是群成员'
      });
      return;
    }

    // 如果是私密群聊，需要邀请才能加入
    if (room.isPrivate) {
      res.status(403).json({
        success: false,
        message: '私密群聊需要邀请才能加入'
      });
      return;
    }

    // 检查人数限制
    if (room.maxMembers && room.members.length >= room.maxMembers) {
      res.status(400).json({
        success: false,
        message: '群聊人数已达上限'
      });
      return;
    }

    // 加入群聊
    room.members.push(userIdObjectId);
    await room.save();

    // 发送系统消息
    const user = await User.findById(userId);
    const systemMessage = new RoomMessage({
      room: room._id,
      sender: userId,
      content: `${user?.username || '未知用户'} 加入了群聊`,
      type: 'system'
    });
    await systemMessage.save();

    res.json({
      success: true,
      message: '加入群聊成功',
      data: room
    });

  } catch (error: unknown) {
    console.error('加入群聊错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 离开群聊
export const leaveRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId } = req.params;
    const userId = req.user.userId;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 检查是否是成员
    // const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const memberIndex = room.members.findIndex(member => 
      member._id ? member._id.toString() === userId : member.toString() === userId
    );
    if (memberIndex === -1) {
      res.status(400).json({
        success: false,
        message: '不是群成员'
      });
      return;
    }

    // 如果是创建者，需要转让创建者权限
    const isCreator = room.creator.toString() === userId;
    if (isCreator) {
      // 如果有其他管理员，转让给第一个管理员
      const otherAdmins = room.adminMembers.filter(admin => 
        admin.toString() !== userId
      );
      if (otherAdmins.length > 0) {
        room.creator = otherAdmins[0];
      } else {
        // 没有其他管理员，转让给其他成员
        const otherMembers = room.members.filter(member => 
          member.toString() !== userId
        );
        if (otherMembers.length > 0) {
          room.creator = otherMembers[0];
          room.adminMembers.push(otherMembers[0]);
        } else {
          // 没有其他成员，删除群聊
          await room.deleteOne();
          await RoomMessage.deleteMany({ room: roomId });
          
          res.json({
            success: true,
            message: '群聊已解散'
          });
          return;
        }
      }
    }

    // 移除成员
    room.members.splice(memberIndex, 1);
    
    // 从管理员列表中移除
    const adminIndex = room.adminMembers.findIndex(admin => 
      admin.toString() === userId
    );
    if (adminIndex > -1) {
      room.adminMembers.splice(adminIndex, 1);
    }

    await room.save();

    // 发送系统消息
    const user = await User.findById(userId);
    const systemMessage = new RoomMessage({
      room: room._id,
      sender: userId,
      content: `${user?.username || '未知用户'} 离开了群聊`,
      type: 'system'
    });
    await systemMessage.save();

    res.json({
      success: true,
      message: '已退出群聊'
    });

  } catch (error: unknown) {
    console.error('离开群聊错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取群聊详情
export const getRoomDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId } = req.params;
    const userId = req.user.userId;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }

    const room = await Room.findById(roomId)
      .populate('creator', 'username avatar')
      .populate('members', 'username avatar isOnline')
      .populate('adminMembers', 'username avatar');

    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 检查是否是成员
    const isMember = room.members.some(member => 
      member._id ? member._id.toString() === userId : member.toString() === userId
    );
    
    if (room.isPrivate && !isMember) {
      res.status(403).json({
        success: false,
        message: '无权访问私密群聊'
      });
      return;
    }

    res.json({
      success: true,
      data: room
    });

  } catch (error: unknown) {
    console.error('获取群聊详情错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 更新群聊信息
export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId } = req.params;
    const userId = req.user.userId;
    const { name, description, avatar, isPrivate, maxMembers } = req.body as UpdateRoomBody;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 检查是否是管理员
    const isAdmin = room.adminMembers.some(admin => 
      admin.toString() === userId
    );
    
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: '只有管理员可以修改群聊信息'
      });
      return;
    }

    // 更新信息（带校验）
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (avatar) room.avatar = avatar;

    // 处理 isPrivate 字段：确保是布尔值
    if (isPrivate !== undefined) {
      // 处理多种可能的输入类型
      let finalIsPrivate: boolean;
      
      if (typeof isPrivate === 'boolean') {
        finalIsPrivate = isPrivate;
      } else if (typeof isPrivate === 'string') {
        finalIsPrivate = isPrivate === 'true' || isPrivate === '1' || isPrivate === 'on';
      } else if (typeof isPrivate === 'number') {
        finalIsPrivate = isPrivate === 1;
      } else {
        finalIsPrivate = Boolean(isPrivate);
      }
      room.isPrivate = finalIsPrivate;
    }

    if (maxMembers !== undefined && !isNaN(maxMembers) && maxMembers > 0) {
      room.maxMembers = maxMembers;
    }

    await room.save();

    res.json({
      success: true,
      message: '群聊信息更新成功',
      data: room
    });

  } catch (error: unknown) {
    console.error('更新群聊错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 邀请用户加入群聊
export const inviteToRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId } = req.params;
    const { userIds } = req.body as InviteToRoomBody;
    const inviterId = req.user.userId;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ success: false, message: '请选择要邀请的用户' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 检查是否是成员
    const isMember = room.members.some(member => 
      member.toString() === inviterId
    );
    
    if (!isMember) {
      res.status(403).json({
        success: false,
        message: '只有群成员可以邀请'
      });
      return;
    }

    // 校验并过滤有效用户ID
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validUserIds.length === 0) {
      res.status(400).json({ success: false, message: '无有效用户ID' });
      return;
    }

    // 检查用户是否存在
    const users = await User.find({ _id: { $in: validUserIds } });
    if (users.length !== validUserIds.length) {
      res.status(400).json({
        success: false,
        message: '部分用户不存在'
      });
      return;
    }

    // 添加新成员（过滤掉已经是成员的用户）
    const newMembers = validUserIds.filter(userId => 
      !room.members.some(member => member.toString() === userId)
    ).map(id => new mongoose.Types.ObjectId(id));

    if (newMembers.length === 0) {
      res.status(400).json({
        success: false,
        message: '用户已全部是群成员'
      });
      return;
    }

    // 检查人数限制
    if (room.maxMembers && room.members.length + newMembers.length > room.maxMembers) {
      res.status(400).json({
        success: false,
        message: '邀请人数超过群聊人数上限'
      });
      return;
    }

    room.members.push(...newMembers);
    await room.save();

    // 发送系统消息
    const inviter = await User.findById(inviterId);
    const invitedUsers = await User.find({ _id: { $in: newMembers } });
    const invitedUsernames = invitedUsers.map(user => user.username || '未知用户').join(', ');
    
    const systemMessage = new RoomMessage({
      room: room._id,
      sender: inviterId,
      content: `${inviter?.username || '未知用户'} 邀请了 ${invitedUsernames} 加入群聊`,
      type: 'system'
    });
    await systemMessage.save();

    res.json({
      success: true,
      message: '邀请成功',
      data: {
        invitedCount: newMembers.length
      }
    });

  } catch (error: unknown) {
    console.error('邀请用户错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId } = req.params;
    const userId = req.user.userId;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({ success: false, message: '无效的群聊ID' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
      return;
    }

    // 检查是否是创建者
    if (room.creator.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: '只有创建者可以解散群聊'
      });
      return;
    }

    // 删除群聊和相关的消息
    await Promise.all([
      Room.findByIdAndDelete(roomId),
      RoomMessage.deleteMany({ room: roomId })
    ]);

    res.json({
      success: true,
      message: '群聊已解散'
    });

  } catch (error: unknown) {
    console.error('解散群聊错误:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 移除群聊成员
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId, userId } = req.params;
    const adminId = req.user.userId;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的ID' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ success: false, message: '群聊不存在' });
      return;
    }

    // 检查操作者是否是管理员或群主
    const isCreator = room.creator.toString() === adminId;
    const isAdmin = room.adminMembers.some(admin => admin.toString() === adminId);
    
    if (!isCreator && !isAdmin) {
      res.status(403).json({ success: false, message: '只有管理员或群主可以移除成员' });
      return;
    }

    // 检查被移除者是否是群成员
    const memberIndex = room.members.findIndex(member => 
      member._id ? member._id.toString() === userId : member.toString() === userId
    );
    if (memberIndex === -1) {
      res.status(400).json({ success: false, message: '该用户不是群成员' });
      return;
    }

    // 不能移除群主
    if (room.creator.toString() === userId) {
      res.status(403).json({ success: false, message: '不能移除群主' });
      return;
    }

    // 管理员不能移除其他管理员（除非是群主操作）
    const targetIsAdmin = room.adminMembers.some(admin => admin.toString() === userId);
    if (targetIsAdmin && !isCreator) {
      res.status(403).json({ success: false, message: '管理员不能移除其他管理员' });
      return;
    }

    // 移除成员
    room.members.splice(memberIndex, 1);
    
    // 如果是管理员，也从管理员列表中移除
    const adminIndex = room.adminMembers.findIndex(admin => admin.toString() === userId);
    if (adminIndex > -1) {
      room.adminMembers.splice(adminIndex, 1);
    }

    await room.save();

    // 发送系统消息
    const admin = await User.findById(adminId);
    const removedUser = await User.findById(userId);
    const systemMessage = new RoomMessage({
      room: room._id,
      sender: adminId,
      content: `${admin?.username || '管理员'} 将 ${removedUser?.username || '成员'} 移出了群聊`,
      type: 'system'
    });
    await systemMessage.save();

    res.json({
      success: true,
      message: '成员已移除'
    });

  } catch (error: unknown) {
    console.error('移除成员错误:', error instanceof Error ? error.message : error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

// 设置/取消管理员
export const toggleAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: '未认证的用户' });
      return;
    }
    const { roomId, userId } = req.params;
    const creatorId = req.user.userId;
    const { isAdmin } = req.body;

    // 校验ID格式
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: '无效的ID' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ success: false, message: '群聊不存在' });
      return;
    }

    // 检查操作者是否是群主
    if (room.creator.toString() !== creatorId) {
      res.status(403).json({ success: false, message: '只有群主可以设置管理员' });
      return;
    }

    // 检查目标用户是否是群成员
    const isMember = room.members.some(member => 
      member._id ? member._id.toString() === userId : member.toString() === userId
    );
    if (!isMember) {
      res.status(400).json({ success: false, message: '该用户不是群成员' });
      return;
    }

    // 不能对自己操作（群主始终是管理员）
    if (userId === creatorId) {
      res.status(400).json({ success: false, message: '不能更改群主的管理员权限' });
      return;
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    if (isAdmin) {
      // 设为管理员
      if (!room.adminMembers.some(admin => admin.toString() === userId)) {
        room.adminMembers.push(userIdObj);
      }
    } else {
      // 取消管理员
      room.adminMembers = room.adminMembers.filter(admin => admin.toString() !== userId);
    }

    await room.save();

    // 发送系统消息
    const creator = await User.findById(creatorId);
    const targetUser = await User.findById(userId);
    const actionText = isAdmin ? '设为管理员' : '取消了管理员权限';
    
    const systemMessage = new RoomMessage({
      room: room._id,
      sender: creatorId,
      content: `${creator?.username || '群主'} 将 ${targetUser?.username || '成员'} ${actionText}`,
      type: 'system'
    });
    await systemMessage.save();

    res.json({
      success: true,
      message: `已${isAdmin ? '设为' : '取消'}管理员`,
      isAdmin
    });

  } catch (error: unknown) {
    console.error('设置管理员错误:', error instanceof Error ? error.message : error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
