import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 定义路径分类
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isChatPage = pathname.startsWith('/chat');
  const isRootPage = pathname === '/';

  // 2. 获取 Token (优先从 Cookie 获取，Middleware 无法访问 localStorage)
  // 注意：前端登录成功后需要同步设置 Cookie
  const token = request.cookies.get('chat-token')?.value;

  // 3. 路由逻辑
  
  // 如果已登录且在访问登录/注册页或根路径，直接重定向到聊天页
  if (token && (isAuthPage || isRootPage)) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // 如果未登录且在访问聊天页，重定向到登录页
  if (!token && isChatPage) {
    const loginUrl = new URL('/login', request.url);
    // 保存当前尝试访问的路径，登录后可以跳回来
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，排除：
     * 1. /api (API 路由)
     * 2. /_next (Next.js 内部资源)
     * 3. /uploads (静态上传文件)
     * 4. 常见的静态文件 (favicon.ico, 等)
     */
    '/((?!api|_next/static|_next/image|uploads|favicon.ico|.*\\..*).*)',
  ],
};
