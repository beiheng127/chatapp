// backend/src/controllers/userSettingsController.ts
import { Request, Response } from 'express';
import User from '../models/User';

// 定义设置类型
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  colorScheme?: string;
  notificationEnabled: boolean;
  notificationSound: boolean;
  chatEnterToSend: boolean;
  privacyOnlineStatus: boolean;
}

// 获取用户设置
export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未认证的用户'
      });
    }

    const user = await User.findById(userId).select('settings');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user.settings || {}
    });
  } catch (error) {
    console.error('获取用户设置错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户设置失败'
    });
  }
};

// 更新用户设置
export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const settings = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未认证的用户'
      });
    }

    // 验证设置数据
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: '设置数据格式不正确'
      });
    }

    // 只更新允许的字段
    const allowedFields = [
      'theme', 'language', 'fontSize', 'compactMode', 'colorScheme',
      'notificationEnabled', 'notificationSound', 'chatEnterToSend', 'privacyOnlineStatus'
    ];

    const updateData: any = {};
    Object.keys(settings).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[`settings.${key}`] = settings[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, select: 'settings' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '设置已保存',
      data: user.settings
    });
  } catch (error) {
    console.error('更新用户设置错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户设置失败'
    });
  }
};

// 重置用户设置为默认值
export const resetUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未认证的用户'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $unset: { settings: '' } }, // 移除设置，使用默认值
      { new: true, select: 'settings' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '设置已重置为默认值',
      data: user.settings || {}
    });
  } catch (error) {
    console.error('重置用户设置错误:', error);
    res.status(500).json({
      success: false,
      message: '重置用户设置失败'
    });
  }
};