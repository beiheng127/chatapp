/**
 * 检查用户是否已登录
 */
export function checkLoginStatus(): {
  isLoggedIn: boolean;
  user: any | null;
  token: string | null;
} {
  if (typeof window === 'undefined') {
    return { isLoggedIn: false, user: null, token: null };
  }

  const token = localStorage.getItem('chat-token');
  const authStorage = localStorage.getItem('auth-storage');
  
  let user = null;
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      user = parsed.state?.user || null;
    } catch (e) {
      console.error('解析auth-storage失败:', e);
    }
  }

  return {
    isLoggedIn: !!token && !!user,
    user,
    token,
  };
}

/**
 * 清理所有认证数据
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('chat-token');
  localStorage.removeItem('auth-storage');
  
  // 清除所有相关cookie
  document.cookie.split(';').forEach(cookie => {
    const [name] = cookie.trim().split('=');
    if (name === 'token' || name === 'user') {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}