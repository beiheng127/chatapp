// backend/src/controllers/roomUploadController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Room from '../models/Room';

// 群聊头像存储路径
const roomAvatarStorageDir = path.join(__dirname, '../../../frontend/public/uploads/room-avatars');

// 确保存储目录存在
if (!fs.existsSync(roomAvatarStorageDir)) {
  fs.mkdirSync(roomAvatarStorageDir, { recursive: true });
  console.log(`已创建群聊头像存储目录：${roomAvatarStorageDir}`);
}

// 配置文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, roomAvatarStorageDir);
  },
  filename: (req, file, cb) => {
    const roomId = req.params.roomId;
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${roomId}${ext}`;
    cb(null, fileName);
  }
});

// 文件上传验证配置
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}).single('avatar');

// 群聊头像上传接口
export const uploadRoomAvatar = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '上传失败' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的头像文件' 
      });
    }
    
    const { roomId } = req.params;
    const userId = (req as any).user.userId;
    
    try {
      // 验证房间是否存在且用户是管理员
      const room = await Room.findById(roomId);
      if (!room) {
        // 删除已上传的文件
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ 
          success: false, 
          message: '群聊不存在' 
        });
      }
      
      // 检查用户是否是管理员
      const isAdmin = room.adminMembers.some(admin => 
        admin.toString() === userId
      ) || room.creator.toString() === userId;
      
      if (!isAdmin) {
        // 删除已上传的文件
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ 
          success: false, 
          message: '只有管理员可以上传群聊头像' 
        });
      }
      
      // 更新房间的头像字段
      const avatarUrl = `/uploads/room-avatars/${req.file.filename}`;
      room.avatar = avatarUrl;
      await room.save();
      
      res.json({
        success: true,
        message: '群聊头像上传成功',
        data: {
          avatarUrl,
          roomId: room._id
        }
      });
      
    } catch (error) {
      console.error('更新群聊头像错误:', error);
      // 删除已上传的文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        message: '服务器内部错误' 
      });
    }
  });
};