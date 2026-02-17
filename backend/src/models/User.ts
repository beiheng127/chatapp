// backend/src/models/User.ts
import mongoose, { 
  Schema, 
  Document, 
  Model, 
  HydratedDocument,
  CallbackError
} from 'mongoose';
import bcrypt from 'bcryptjs';

// 用户文档接口
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  isOnline?: boolean;
  bio?: string;
  lastSeen?: Date;
  sessions?: {
    sessionId: string;
    ip: string;
    userAgent: string;
    lastActive: Date;
    deviceType?: string;
  }[];
  // 添加设置字段
  settings?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    colorScheme?: string;
    notificationEnabled: boolean;
    notificationSound: boolean;
    chatEnterToSend: boolean;
    privacyOnlineStatus: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 用户实例方法接口
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 自定义模型接口（含静态方法签名）
// 修复：空对象类型添加 eslint 忽略注释（不改变原有泛型结构）
/* eslint-disable @typescript-eslint/no-empty-object-type */
interface IUserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<HydratedDocument<IUser> | null>;
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

// 创建Schema - 使用正确的泛型参数（保留原有结构）
const userSchema = new Schema<IUser, IUserModel, IUserMethods>({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [30, '用户名不能超过30个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '请提供有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少需要6个字符'],
    select: false // 默认查询时不返回密码字段
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [160, '个人简介不能超过160个字符'],
    default: ''
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  sessions: [{
    sessionId: { type: String, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    lastActive: { type: Date, default: Date.now },
    deviceType: { type: String, default: 'unknown' }
  }],
  settings: {
    type: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      language: {
        type: String,
        default: 'zh-CN'
      },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      compactMode: {
        type: Boolean,
        default: false
      },
      colorScheme: {
        type: String,
        default: '#1890ff'
      },
      notificationEnabled: {
        type: Boolean,
        default: true
      },
      notificationSound: {
        type: Boolean,
        default: true
      },
      chatEnterToSend: {
        type: Boolean,
        default: true
      },
      privacyOnlineStatus: {
        type: Boolean,
        default: true
      }
    },
    default: {
      theme: 'system',
      language: 'zh-CN',
      fontSize: 'medium',
      compactMode: false,
      colorScheme: '#1890ff',
      notificationEnabled: true,
      notificationSound: true,
      chatEnterToSend: true,
      privacyOnlineStatus: true
    }
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password; // 序列化时删除密码字段
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// 密码哈希中间件 - 使用正确的中间件类型
userSchema.pre('save', async function(this: HydratedDocument<IUser>, next: (err?: CallbackError) => void) {
  // 只有当密码被修改时才进行哈希
  if (!this.isModified('password')) return next();
  
  try {
    // 生成盐并哈希密码
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (error) {
    // 修复：替换 any 为 unknown（不改变逻辑，仅消除 any 警告）
    next(error as CallbackError);
  }
});

// 实例方法：比较密码 - 正确添加到methods
userSchema.methods.comparePassword = async function(
  this: HydratedDocument<IUser>,
  candidatePassword: string
): Promise<boolean> {
  try {
    // 当 password 未被选中（select:false）时，可能为 undefined
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    // 记录错误但返回验证失败
    console.error('密码比较错误:', error);
    return false;
  }
};

// 可选：添加一些查询辅助方法（静态方法）
userSchema.statics.findByEmail = async function(
  this: IUserModel,
  email: string
): Promise<HydratedDocument<IUser> | null> {
  return this.findOne({ email }).select('+password').exec();
};

// 添加虚拟字段（不存储在数据库）
userSchema.virtual('profileUrl').get(function(this: IUser) {
  return `/api/users/${this._id}/profile`;
});

// 创建模型（保留原有泛型结构）
const User: IUserModel = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;