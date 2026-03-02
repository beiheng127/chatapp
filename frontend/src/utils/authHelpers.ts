/**
 * 处理认证响应，确保数据结构一致性
 */
export function normalizeAuthResponse(response: any) {
  // 如果 response 有 data 字段，使用 data 中的数据
  if (response.data) {
    return {
      success: response.success,
      message: response.message,
      token: response.data.token || response.token,
      user: response.data.user || response.user,
      data: response.data
    };
  }
  
  // 如果没有 data 字段，使用根级别的 token 和 user
  return {
    success: response.success,
    message: response.message,
    token: response.token,
    user: response.user,
    data: {
      token: response.token,
      user: response.user
    }
  };
}

/**
 * 检查响应是否包含有效的认证数据
 */
export function hasValidAuthData(response: any): boolean {
  // 检查是否有 token 和 user（支持新旧两种格式）
  const hasToken = !!(response.data?.token || response.token);
  const hasUser = !!(response.data?.user || response.user);
  
  return response.success && hasToken && hasUser;
}

/**
 * 从响应中提取 token（支持新旧格式）
 */
export function extractToken(response: any): string | null {
  return response.data?.token || response.token || null;
}

/**
 * 从响应中提取 user（支持新旧格式）
 */
export function extractUser(response: any): any | null {
  return response.data?.user || response.user || null;
}