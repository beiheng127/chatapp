// frontend/src/services/uploadService.ts
import { apiClient, type ApiResponse } from './apiClient';

export interface UploadResponseData {
  url: string;
  filename: string;
  size: number;
  type: string;
  uploadedName?: string;
  icon?: string;
}

export interface MultipleUploadResponse {
  success: boolean;
  message: string;
  data: UploadResponseData[];
}

export const uploadService = {
  // 上传头像
  async uploadAvatar(file: File, onProgress?: (percent: number) => void): Promise<ApiResponse<UploadResponseData>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return apiClient.upload<UploadResponseData>('/upload/avatar', formData, onProgress);
  },

  // 上传消息图片
  async uploadMessageImage(file: File, onProgress?: (percent: number) => void): Promise<ApiResponse<UploadResponseData>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.upload<UploadResponseData>('/upload/message/image', formData, onProgress);
  },

  // 上传消息文件
  async uploadMessageFile(file: File, onProgress?: (percent: number) => void): Promise<ApiResponse<UploadResponseData>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.upload<UploadResponseData>('/upload/message/file', formData, onProgress);
  },

  // 通用上传（根据type参数）
  async uploadFile(file: File, type: 'avatar' | 'messageImage' | 'messageFile' = 'messageFile', onProgress?: (percent: number) => void): Promise<ApiResponse<UploadResponseData>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.upload<UploadResponseData>(`/upload/file?type=${type}`, formData, onProgress);
  },

  // 批量上传
  async uploadMultipleFiles(files: File[], fileType: 'image' | 'file' = 'file', onProgress?: (percent: number) => void): Promise<ApiResponse<UploadResponseData[]>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('fileType', fileType);
    
    return apiClient.upload<UploadResponseData[]>('/upload/multiple', formData, onProgress);
  },

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 获取文件图标
  getFileIcon(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const iconMap: Record<string, string> = {
      'pdf': '📕',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'txt': '📄',
      'zip': '📦',
      'rar': '📦',
      '7z': '📦',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'bmp': '🖼️',
      'mp3': '🎵',
      'wav': '🎵',
      'mp4': '🎬',
      'mov': '🎬',
      'avi': '🎬',
      'default': '📎'
    };
    
    return iconMap[ext || ''] || iconMap.default;
  },

  // 检查是否是图片文件
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  },

  // 获取文件类型
  getFileType(file: File): 'image' | 'file' {
    return this.isImageFile(file) ? 'image' : 'file';
  }
};