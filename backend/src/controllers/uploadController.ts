// backend/src/controllers/uploadController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 定义上传类型
type UploadType = 'avatar' | 'room-avatar' | 'message-image' | 'message-file' | 'group-avatar';

// 配置上传目录
const UPLOAD_BASE_DIR = path.join(__dirname, '../../../frontend/public/uploads');

// 创建所有必要的目录
const createUploadDirectories = () => {
  const directories = [
    'avatars',
    'room-avatars',
    'message-images',
    'message-files',
    'group-avatars'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(UPLOAD_BASE_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`已创建目录：${fullPath}`);
    }
  });
};

// 初始化创建目录
createUploadDirectories();

// 根据上传类型获取存储配置
const getStorageConfig = (uploadType: UploadType) => {
  let destinationDir: string;
  let filenamePrefix = '';

  switch (uploadType) {
    case 'avatar':
      destinationDir = path.join(UPLOAD_BASE_DIR, 'avatars');
      filenamePrefix = 'user_';
      break;
    case 'room-avatar':
      destinationDir = path.join(UPLOAD_BASE_DIR, 'room-avatars');
      filenamePrefix = 'room_';
      break;
    case 'message-image':
      destinationDir = path.join(UPLOAD_BASE_DIR, 'message-images');
      filenamePrefix = 'img_';
      break;
    case 'message-file':
      destinationDir = path.join(UPLOAD_BASE_DIR, 'message-files');
      filenamePrefix = 'file_';
      break;
    case 'group-avatar':
      destinationDir = path.join(UPLOAD_BASE_DIR, 'group-avatars');
      filenamePrefix = 'group_';
      break;
    default:
      destinationDir = path.join(UPLOAD_BASE_DIR, 'temp');
  }

  // 确保目录存在
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      const authHeader = req.headers.authorization;
      
      // 生成唯一文件名
      const uniqueId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      
      let fileName: string;
      
      if (uploadType === 'avatar' && authHeader?.startsWith('Bearer ')) {
        // 头像上传：使用用户ID作为文件名（覆盖式）
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key') as any;
          const userId = decoded.userId;
          fileName = `${filenamePrefix}${userId}${ext}`;
        } catch (error) {
          // token无效时使用随机名称
          fileName = `${filenamePrefix}${timestamp}_${uniqueId}${ext}`;
        }
      } else {
        // 其他类型：使用随机名称
        const safeOriginalName = file.originalname
          .replace(/[^\w\s.-]/gi, '')
          .replace(/\s+/g, '_');
        
        fileName = `${filenamePrefix}${timestamp}_${uniqueId}_${safeOriginalName}`;
        
        // 如果文件名太长，截断
        if (fileName.length > 255) {
          const nameWithoutExt = safeOriginalName.substring(0, 100);
          const finalExt = path.extname(fileName);
          fileName = `${filenamePrefix}${timestamp}_${uniqueId}_${nameWithoutExt}${finalExt}`;
        }
      }
      
      cb(null, fileName);
    }
  });
};

// 文件过滤器配置
const fileFilter = (allowedTypes: string[], maxSizeMB: number = 10) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 检查文件类型
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      const allowedExtensions = allowedTypes.map(t => t.split('/')[1]).join(', ');
      return cb(new Error(`只允许上传以下类型：${allowedExtensions}`));
    }
    
    // 检查文件大小
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return cb(new Error(`文件大小不能超过 ${maxSizeMB}MB`));
    }
    
    cb(null, true);
  };
};

// 不同上传类型的配置
const uploadConfigs = {
  avatar: {
    storage: getStorageConfig('avatar'),
    fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp'], 2),
    limits: { fileSize: 2 * 1024 * 1024 }
  },
  roomAvatar: {
    storage: getStorageConfig('room-avatar'),
    fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp'], 2),
    limits: { fileSize: 2 * 1024 * 1024 }
  },
  messageImage: {
    storage: getStorageConfig('message-image'),
    fileFilter: fileFilter([
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ], 10),
    limits: { fileSize: 10 * 1024 * 1024 }
  },
  messageFile: {
    storage: getStorageConfig('message-file'),
    fileFilter: fileFilter([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'video/quicktime'
    ], 50),
    limits: { fileSize: 50 * 1024 * 1024 }
  },
  groupAvatar: {
    storage: getStorageConfig('group-avatar'),
    fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp'], 2),
    limits: { fileSize: 2 * 1024 * 1024 }
  }
};

// 创建multer实例
const createUploader = (type: keyof typeof uploadConfigs) => {
  return multer(uploadConfigs[type]).single(type === 'messageImage' || type === 'messageFile' ? 'file' : 'avatar');
};

// 头像上传接口（保持原有逻辑）
export const uploadAvatar = (req: Request, res: Response) => {
  const upload = createUploader('avatar');
  
  upload(req, res, (err) => {
    if (err) {
      console.error('头像上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '头像上传失败' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的头像文件' 
      });
    }
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      message: '头像上传成功',
      data: {
        avatarUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  });
};

// 消息图片上传接口
export const uploadMessageImage = (req: Request, res: Response) => {
  const upload = createUploader('messageImage');
  
  upload(req, res, (err) => {
    if (err) {
      console.error('消息图片上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '图片上传失败' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的图片文件' 
      });
    }
    
    const imageUrl = `/uploads/message-images/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      message: '图片上传成功',
      data: {
        url: imageUrl,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedName: req.file.filename
      }
    });
  });
};

// 消息文件上传接口
export const uploadMessageFile = (req: Request, res: Response) => {
  const upload = createUploader('messageFile');
  
  upload(req, res, (err) => {
    if (err) {
      console.error('消息文件上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '文件上传失败' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的文件' 
      });
    }
    
    const fileUrl = `/uploads/message-files/${req.file.filename}`;
    
    // 获取文件图标
    const getFileIcon = (filename: string) => {
      const ext = path.extname(filename).toLowerCase();
      const iconMap: Record<string, string> = {
        '.pdf': '📕',
        '.doc': '📝',
        '.docx': '📝',
        '.xls': '📊',
        '.xlsx': '📊',
        '.txt': '📄',
        '.zip': '📦',
        '.rar': '📦',
        '.7z': '📦',
        '.jpg': '🖼️',
        '.jpeg': '🖼️',
        '.png': '🖼️',
        '.gif': '🖼️',
        '.bmp': '🖼️',
        '.mp3': '🎵',
        '.wav': '🎵',
        '.mp4': '🎬',
        '.mov': '🎬',
        '.avi': '🎬'
      };
      
      return iconMap[ext] || '📎';
    };
    
    res.status(200).json({
      success: true,
      message: '文件上传成功',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedName: req.file.filename,
        icon: getFileIcon(req.file.originalname)
      }
    });
  });
};

// 通用文件上传接口（根据type参数决定上传类型）
export const uploadFile = (req: Request, res: Response) => {
  const { type = 'messageFile' } = req.query;
  
  let uploadType: keyof typeof uploadConfigs;
  
  switch (type) {
    case 'avatar':
      uploadType = 'avatar';
      break;
    case 'roomAvatar':
      uploadType = 'roomAvatar';
      break;
    case 'messageImage':
      uploadType = 'messageImage';
      break;
    case 'groupAvatar':
      uploadType = 'groupAvatar';
      break;
    default:
      uploadType = 'messageFile';
  }
  
  const upload = createUploader(uploadType);
  
  upload(req, res, (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '文件上传失败' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的文件' 
      });
    }
    
    // 根据类型确定URL路径
    let fileUrl = '';
    switch (uploadType) {
      case 'avatar':
        fileUrl = `/uploads/avatars/${req.file.filename}`;
        break;
      case 'roomAvatar':
        fileUrl = `/uploads/room-avatars/${req.file.filename}`;
        break;
      case 'messageImage':
        fileUrl = `/uploads/message-images/${req.file.filename}`;
        break;
      case 'groupAvatar':
        fileUrl = `/uploads/group-avatars/${req.file.filename}`;
        break;
      default:
        fileUrl = `/uploads/message-files/${req.file.filename}`;
    }
    
    res.status(200).json({
      success: true,
      message: '文件上传成功',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedName: req.file.filename
      }
    });
  });
};

// 批量文件上传接口
export const uploadMultipleFiles = (req: Request, res: Response) => {
  const { fileType = 'messageFile' } = req.body;
  
  let uploadType: keyof typeof uploadConfigs;
  
  switch (fileType) {
    case 'image':
      uploadType = 'messageImage';
      break;
    case 'file':
    default:
      uploadType = 'messageFile';
  }
  
  const upload = multer(uploadConfigs[uploadType]).array('files', 10); // 最多10个文件
  
  upload(req, res, (err) => {
    if (err) {
      console.error('批量文件上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '文件上传失败' 
      });
    }
    
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的文件' 
      });
    }
    
    const files = req.files as Express.Multer.File[];
    const uploads = files.map(file => {
      const url = uploadType === 'messageImage' 
        ? `/uploads/message-images/${file.filename}`
        : `/uploads/message-files/${file.filename}`;
      
      return {
        url,
        filename: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadedName: file.filename
      };
    });
    
    res.status(200).json({
      success: true,
      message: `成功上传 ${uploads.length} 个文件`,
      data: uploads
    });
  });
};