import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // 配置后端API代理
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/socket/:path*',
        destination: 'http://localhost:5000/socket/:path*',
      },
    ];
  },
  
  // 更新图片配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    unoptimized: true,
  },
  
  // // 如果使用webpack
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //       net: false,
  //       tls: false,
  //     };
  //   }
  //   return config;
  // },
  
  // 禁用严格的服务器端渲染
  experimental: {
    // optimizeCss: false,
    // serverComponentsExternalPackages: [],
  },
  serverExternalPackages: ["mongoose"],
  // 输出追踪
  outputFileTracingRoot: process.cwd(),
  
  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
  },
  
  // 压缩
  compress: true,
  
  // 启用静态文件服务
  trailingSlash: false,
  // 重定向配置
  async redirects() {
    return [];
  },
};

export default nextConfig;