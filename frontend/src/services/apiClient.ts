// frontend/src/services/apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// 统一的 API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// 定义查询参数类型
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

// 定义请求数据类型
export type RequestData = Record<string, unknown> | Array<unknown> | null | undefined;

// 安全的获取 localStorage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chat-token');
};

// 安全的移除 localStorage
const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('chat-token');
};

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // 使用安全的函数获取token
    const token = getToken();
    
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // 处理无内容响应
      if (response.status === 204) {
        return { success: true };
      }

      // 定义响应数据的基础类型
      type ResponseData = {
        success: boolean;
        message?: string;
        data?: T;
      };
      
      let data: ResponseData;
      try {
        const text = await response.text();
        // 尝试解析为 JSON
        try {
          data = JSON.parse(text) as ResponseData;
        } catch (e) {
          // 如果解析失败，说明不是 JSON
          if (!response.ok) {
            throw new Error(`服务器错误 (HTTP ${response.status})`);
          }
          throw new Error('服务器响应格式不正确');
        }
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('解析服务器响应失败');
      }
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API请求错误 [${endpoint}]:`, error);
      
      // 类型守卫判断错误类型
      const errorMessage = error instanceof Error 
        ? error.message 
        : '未知错误';
      
      // 如果是401未授权，清除token
      if (errorMessage.includes('401') || errorMessage.includes('未授权')) {
        removeToken();
      }
      
      return {
        success: false,
        message: errorMessage || '网络请求失败，请检查网络连接',
      };
    }
  }

  async get<T>(endpoint: string, queryParams?: QueryParams): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (queryParams) {
      // 过滤掉 null/undefined 的参数
      const filteredParams = Object.entries(queryParams).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>);
      
      const params = new URLSearchParams(filteredParams).toString();
      if (params) {
        url += `?${params}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: RequestData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: RequestData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: RequestData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 添加 FormData 支持的上传方法
  async upload<T>(endpoint: string, formData: FormData, onProgress?: (percent: number) => void): Promise<ApiResponse<T>> {
    const token = getToken();
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', url, true);
      
      // 设置请求头
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });
      
      // 监听上传进度
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            console.log(`[ApiClient] Upload progress: ${percent}% (${event.loaded}/${event.total})`);
            onProgress(percent);
          } else {
            console.log('[ApiClient] Upload progress event fired but length not computable');
          }
        };
      } else {
         console.log('[ApiClient] Setup: xhr.upload or onProgress missing', { hasUpload: !!xhr.upload, hasCallback: !!onProgress });
      }
      
      // 监听完成
      xhr.onload = () => {
        console.log(`[ApiClient] Upload finished with status ${xhr.status}`);
        try {
          if (xhr.status === 204) {
            resolve({ success: true });
            return;
          }
          
          const response = JSON.parse(xhr.responseText) as ApiResponse<T>;
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            // 处理401未授权
            if (xhr.status === 401) {
              removeToken();
            }
            
            resolve({
              success: false,
              message: response.message || `HTTP ${xhr.status}`
            });
          }
        } catch (error) {
          console.error(`解析响应错误 [${endpoint}]:`, error);
          resolve({
            success: false,
            message: '解析服务器响应失败'
          });
        }
      };
      
      // 监听错误
      xhr.onerror = () => {
        console.error(`上传错误 [${endpoint}]: 网络错误`);
        resolve({
          success: false,
          message: '上传失败，请检查网络连接'
        });
      };
      
      // 发送请求
      xhr.send(formData);
    });
  }
}

export const apiClient = new ApiClient();