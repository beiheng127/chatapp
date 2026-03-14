# 💬 ChatApp - 实时聊天应用平台

![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange.svg)
![Status](https://img.shields.io/badge/Status-Active-success.svg)

## 📋 项目简介

**ChatApp** 是一个现代化的全栈实时聊天应用平台。支持**房间群聊**与**私聊**、**文件上传**、**在线状态提示**与**输入中提示**。采用前后端分离架构，前端基于 **Next.js 16 + React 19** 构建，后端基于 **Express 5 + MongoDB** 驱动，使用 **WebSocket** 实现毫秒级实时通信，为用户提供流畅的即时通讯体验。

### ✨ 核心特性

- 🏠 **房间管理** - 创建/加入/邀请，公共房间发现，房间权限控制
- 💬 **群聊功能** - 多人实时对话，消息历史查询，群聊设置和管理
- 👤 **私聊系统** - 一对一私信，会话列表，已读状态管理
- 📁 **文件上传** - 支持头像、图片、文档等多种文件类型
- 🟢 **在线状态** - 实时用户在线列表，状态提示（在线/离线）
- ⌨️ **输入提示** - 用户输入中/结束输入实时广播，流畅的交互体验
- 🔐 **JWT 认证** - 安全的用户鉴权和会话管理
- ⚡ **实时通信** - WebSocket 低延迟消息传递，支持多消息类型

---

## 📖 目录

- [项目简介](#项目简介)
- [屏幕截图](#屏幕截图)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [核心功能模块](#核心功能模块)
- [实时通信](#实时通信)
- [API 文档](#api-文档)
- [快速开始](#快速开始)
- [安全建议](#安全建议)
- [开源协议](#开源协议)

---

## 🖼️ 屏幕截图

### 用户界面

#### 用户主页
![用户主页面](https://github.com/user-attachments/assets/6f027f9a-6525-44e9-a30b-ce9ef7adf378)

#### 个人资料
![个人资料](https://github.com/user-attachments/assets/eda0392c-61f6-4950-8339-6621bc155fc6)

#### 系统设置
![系统设置](https://github.com/user-attachments/assets/9caac3f5-0378-4228-a281-fb1e7cff295a)

### 私聊功能

#### 私聊界面
![私聊界面](https://github.com/user-attachments/assets/59783778-34fd-447f-84a4-408df2372ea5)

### 群聊功能

#### 群聊聊天室
![群聊聊天室界面](https://github.com/user-attachments/assets/3877b6a0-b430-448e-a671-93099b68ed59)

#### 群聊信息
![群聊的信息](https://github.com/user-attachments/assets/2c19ce9d-aa0c-481b-bfa6-303ae5506369)

#### 群聊设置
![群聊设置](https://github.com/user-attachments/assets/b4777afc-beaa-4213-abb2-8a86f9afb199)

#### 邀请成员
![邀请成员](https://github.com/user-attachments/assets/347052d1-a23e-4c13-97e4-61d669e8fc8a)

#### 群聊列表
![群聊列表](https://github.com/user-attachments/assets/a2aa528c-72e3-4eb4-8cf4-b4d70160be90)

---

## 🛠️ 技术栈

### 🎨 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| **Next.js** | 16 | React 全栈框架（App Router） |
| **React** | 19 | 用户界面库 |
| **TypeScript** | Latest | 类型安全的 JavaScript |
| **Ant Design** | Latest | 企业级 UI 组件库 |
| **Zustand** | Latest | 轻量级状态管理 |
| **styled-components** | Latest | CSS-in-JS 样式库 |
| **Tailwind CSS** | Latest | 功能性 CSS 框架 |
| **Axios** | Latest | HTTP 客户端库 |

**核心特性**:
- App Router 目录结构
- Server Components 和 Client Components 混合使用
- 自动路由和代码分割
- 内置 API 路由代理

**参考文件**:
- 前端配置: `frontend/next.config.ts`
- 依赖清单: `frontend/package.json`

### 🔧 后端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| **Express** | 5 | Node.js Web 框架 |
| **TypeScript** | Latest | 类型安全的 JavaScript |
| **Mongoose** | Latest | MongoDB ODM 库 |
| **MongoDB** | 5.0+ | NoSQL 数据库 |
| **WebSocket (ws)** | Latest | 实时通信库 |
| **JWT (jsonwebtoken)** | Latest | Token 认证 |
| **Multer** | Latest | 文件上传中间件 |
| **express-validator** | Latest | 请求验证中间件 |
| **CORS** | Latest | 跨域资源共享 |

**核心特性**:
- 异步路由处理
- WebSocket 服务集成
- 文件上传处理
- 请求数据验证

**参考文件**:
- 后端入口: `backend/server.ts`
- WebSocket 服务: `backend/src/websocket/server.ts`
- 依赖清单: `backend/package.json`

---

## 🏗️ 系统架构

### 架构设计图

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 / 客户端                        │
└────────────┬────────────────────────────────────┬───────────┘
             │ HTTP/HTTPS                         │ WebSocket
             ▼                                     ▼
┌──────────────────────────────────────┐  ┌──────────────────────────┐
│   前端应用 (Next.js 16 + React 19)    │  │  Reverse Proxy (Nginx)   │
│ ┌───────────────────────────────────┤  │  - 负载均衡              │
│ │ 📄 Pages (App Router)             │  │  - SSL 终止              │
│ │ - /auth 认证页面                  │  │  - 静态资源缓存          │
│ │ - /chat 聊天页面                  │  └──────────────┬──────────┘
│ │ - /rooms 房间页面                 │                │
│ │ - /profile 个人资料               │                ▼
│ │ - /settings 系统设置              │  ┌──────────────────────────────┐
│ ├───────────────────────────────────┤  │   Express.js 后端           │
│ │ 🔧 核心模块                        │  │ ┌──────────────────────────┤
│ │ - Zustand 状态管理                │  │ │ 🔐 Authentication Layer  │
│ │ - useWebSocket Hook               │  │ │ - JWT 认证               │
│ │ - Axios 网络请求                  │  │ │ - 用户认证检查           │
│ │ - Ant Design 组件库               │  │ ├──────────────────────────┤
│ ├───────────────────────────────────┤  │ │ 🎯 API 路由 (REST)       │
│ │ styled-components CSS             │  │ │ - /api/auth              │
│ │ Tailwind CSS utilities            │  │ │ - /api/rooms             │
│ └───────────────────────────────────┘  │ │ - /api/direct-messages   │
│                                         │ │ - /api/upload            │
│  Next.js Dev Server (Port 3000)        │ │ - /api/users             │
│  API Rewrites: /api -> localhost:5000  │ ├──────────────────────────┤
│  WS Rewrites: /socket -> ws://...      │ │ 💾 Database & Storage    │
│                                         │ │ - Mongoose ORM           │
│                                         │ │ - MongoDB 连接           │
│                                         │ │ - 文件存储目录           │
│                                         │ ├──────────────────────────┤
│                                         │ │ 🔄 WebSocket 服务        │
│                                         │ │ - 房间消息广播           │
│                                         │ │ - 私信通知               │
│                                         │ │ - 用户在线状态           │
│                                         │ │ - 输入状态提示           │
│                                         │ └──────────────────────────┘
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
        ┌────────────────┐         ┌─────────────────┐
        │ MongoDB 数据库  │         │ 文件存储系统      │
        │ - 用户数据      │         │ /uploads        │
        │ - 房间信息      │         │ - 用户头像      │
        │ - 消息记录      │         │ - 聊天图片/文件 │
        │ - 会话数据      │         └──────────��──────┘
        └────────────────┘
```

### 前后端通信流程

#### HTTP API 请求流

```
Frontend (Next.js)
    │
    ├─► /api/auth/login
    │   └─► Express API
    │       └─► MongoDB (验证用户)
    │           └─► 返回 JWT Token
    │
    ├─► /api/rooms
    │   └─► 获取房间列表
    │
    └─► /api/upload/avatar
        └─► 上传用户头像到文件系统
```

#### WebSocket 实时通信流

```
Frontend (WebSocket Client)
    │
    ├─► join_room
    │   └─► WebSocket Server
    │       └─► 广播 user_joined 事件
    │           └─► 所有房间成员收到更新
    │
    ├─► chat_message
    │   └─► 保存到 MongoDB
    │       └─► 广播 message_sent
    │           └─► 房间内所有用户接收
    │
    └─► direct_message
        └─► 保存到 MongoDB
            └─► 发送私信通知给目标用户
```

### 目录结构

```
chatapp/
├── backend/                              # Express + MongoDB 后端
│   ├── src/
│   │   ├── controllers/                  # 业务逻辑控制器
│   │   │   ├── auth.ts                   # 认证控制器
│   │   │   ├── user.ts                   # 用户控制器
│   │   │   ├── room.ts                   # 房间控制器
│   │   │   ├── roomMessage.ts            # 房间消息控制器
│   │   │   ├── directMessage.ts          # 私信控制器
│   │   │   └── upload.ts                 # 文件上传控制器
│   │   ├── routes/                       # API 路由定义
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── room.ts
│   │   │   ├── roomMessage.ts
│   │   │   ├── directMessage.ts
│   │   │   └── uploadRoutes.ts
│   │   ├── models/                       # Mongoose 数据模型
│   │   │   ├── User.ts
│   │   │   ├── Room.ts
│   │   │   ├── Message.ts
│   │   │   ├── DirectMessage.ts
│   │   │   └── UserSettings.ts
│   │   ├── middleware/                   # Express 中间件
│   │   │   ├── auth.ts                   # JWT 验证中间件
│   │   │   └── errorHandler.ts
│   │   ├── websocket/                    # WebSocket 服务
│   │   │   └── server.ts                 # WebSocket 事件处理
│   │   └── utils/                        # 工具函数
│   ├── uploads/                          # 文件存储目录
│   ├── server.ts                         # 应用入口
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                             # Next.js 前端应用
│   ├── src/
│   │   ├── app/                          # App Router 页面
│   │   │   ├── (auth)/                   # 认证相关页面
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (main)/                   # 主应用页面
│   │   │   │   ├── chat/page.tsx         # 聊天页面
│   │   │   │   ├── rooms/page.tsx        # 房间列表
│   │   │   │   ├── profile/page.tsx      # 个人资料
│   │   │   │   └── settings/page.tsx     # 系统设置
│   │   │   └── layout.tsx
│   │   ├── components/                   # React 组件库
│   │   │   ├── Chat/
│   │   │   ├── Room/
│   │   │   ├── User/
│   │   │   ├── Message/
│   │   │   └── Common/
│   │   ├── store/                        # Zustand 状态管理
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── userStore.ts
│   │   ├── hooks/                        # React Hooks
│   │   │   ├── useWebSocket.ts           # WebSocket Hook
│   │   │   ├── useAuth.ts
│   │   │   └── useChat.ts
│   │   ├── services/                     # API 服务
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── roomService.ts
│   │   │   ├── messageService.ts
│   │   │   └── uploadService.ts
│   │   └── types/                        # TypeScript 类型定义
│   │       ├── user.ts
│   │       ├── room.ts
│   │       └── message.ts
│   ├── public/                           # 静态资源
│   ├── next.config.ts                    # Next.js 配置
│   ├── package.json
│   └── tsconfig.json
│
└── README.md                             # 本文档
```

---

## 🎯 核心功能模块

### 1️⃣ 用户与认证（Auth）

**端点**: `/api/auth`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 注册 | POST | `/api/auth/register` | 新用户注册 |
| 登录 | POST | `/api/auth/login` | 用户登录获取 JWT Token |
| 退出 | POST | `/api/auth/logout` | 退出登录 |
| 获取资料 | GET | `/api/auth/profile` | 获取当前用户信息 |
| 更新资料 | PUT | `/api/auth/profile` | 更新用户信息 |
| 在线用户 | GET | `/api/auth/online-users` | 获取当前在线用户列表 |

**技术实现**:
- JWT Token 生成与验证 → `backend/src/controllers/auth.ts`
- 认证中间件 → `backend/src/middleware/auth.ts`
- 密码加密存储（bcrypt）

**核心实体**:
```typescript
User {
  _id: ObjectId
  username: string              // 用户名
  email: string                 // 邮箱
  passwordHash: string          // 加密后的密码
  avatar?: string               // 头像 URL
  status: 'online' | 'offline'  // 在线状态
  createdAt: Date
  updatedAt: Date
}
```

### 2️⃣ 房间与群聊（Rooms）

**端点**: `/api/rooms`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 创建房间 | POST | `/api/rooms/create` | 创建新房间 |
| 我的房间 | GET | `/api/rooms/my-rooms` | 获取用户加入的房间 |
| 公共房间 | GET | `/api/rooms/public` | 获取所有公共房间 |
| 房间详情 | GET | `/api/rooms/:roomId` | 获取房间信息 |
| 更新房间 | PUT | `/api/rooms/:roomId` | 更新房间信息（仅房主） |
| 删除房间 | DELETE | `/api/rooms/:roomId` | 删除房间（仅房主） |
| 加入房间 | POST | `/api/rooms/:roomId/join` | 加入房间 |
| 离开房间 | POST | `/api/rooms/:roomId/leave` | 离开房间 |
| 邀请成员 | POST | `/api/rooms/:roomId/invite` | 邀请用户加入房间 |

**核心实体**:
```typescript
Room {
  _id: ObjectId
  name: string                  // 房间名称
  description?: string          // 房间描述
  owner: ObjectId               // 房主 ID
  members: ObjectId[]           // 成员 ID 列表
  avatar?: string               // ��间头像
  isPublic: boolean             // 是否公开
  maxMembers?: number           // 最大成员数
  createdAt: Date
  updatedAt: Date
}
```

**实时事件**（WebSocket）:
- `join_room` - 用户加入房间
- `user_joined` - 广播用户加入
- `user_left` - 广播用户离开
- `room_updated` - 房间信息更新

### 3️⃣ 房间消息（Room Messages）

**端点**: `/api/room-messages`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 获取消息 | GET | `/api/room-messages/:roomId/messages` | 获取房间消息历史 |
| 发送消息 | POST | `/api/room-messages/:roomId/send` | 发送房间消息 |
| 删除消息 | DELETE | `/api/room-messages/message/:messageId` | 删除消息 |

**核心实体**:
```typescript
Message {
  _id: ObjectId
  room: ObjectId                // 房间 ID
  sender: ObjectId              // 发送者 ID
  content: string               // 消息内容
  type: 'text' | 'image' | 'file'  // 消息类型
  fileUrl?: string              // 文件 URL
  createdAt: Date
  updatedAt: Date
}
```

**实时事件**（WebSocket）:
- `chat_message` - 发送消息
- `message_sent` - 消息已发送

### 4️⃣ 私信与会话（Direct Messages）

**端点**: `/api/direct-messages`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 发送私信 | POST | `/api/direct-messages/send` | 发送私信 |
| 会话列表 | GET | `/api/direct-messages/conversations` | 获取会话列表 |
| 会话详情 | GET | `/api/direct-messages/conversation/:userId` | 获取与某用户的私信历史 |
| 标记已读 | PUT | `/api/direct-messages/read/:messageId` | 标记单条消息已读 |
| 批量已读 | PUT | `/api/direct-messages/read-multiple` | 批量标记已读 |

**核心实体**:
```typescript
DirectMessage {
  _id: ObjectId
  sender: ObjectId              // 发送者 ID
  receiver: ObjectId            // 接收者 ID
  content: string               // 消息内容
  type: 'text' | 'image' | 'file'
  fileUrl?: string
  isRead: boolean               // 是否已读
  createdAt: Date
}

Conversation {
  _id: ObjectId
  participants: ObjectId[]      // 参与者（2 人）
  lastMessage: ObjectId         // 最后一条消息 ID
  updatedAt: Date
}
```

**实时事件**（WebSocket）:
- `direct_message` - 发送私信
- `message_notification` - 私信通知

### 5️⃣ 文件上传（Upload）

**端点**: `/api/upload`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 用户头像 | POST | `/api/upload/avatar` | 上传用户头像 |
| 消息图片 | POST | `/api/upload/message/image` | 上传聊天图片 |
| 消息文件 | POST | `/api/upload/message/file` | 上传聊天文件 |
| 通用文件 | POST | `/api/upload/file` | 上传通用文件 |
| 批量上传 | POST | `/api/upload/multiple` | 批量上传文件 |

**实现**:
- Multer 文件处理 → `backend/src/controllers/upload.ts`
- 本地文件系统存储 → `backend/uploads/`
- 支持的文件类型：图片、文档、媒体文件

### 6️⃣ 用户搜索与在线状态

**端点**: `/api/users`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 搜索用户 | GET | `/api/users/search` | 搜索用户（支持分页） |
| 在线用户 | GET | `/api/users/online` | 获取在线用户列表 |
| 用户详情 | GET | `/api/users/:userId` | 获取用户信息 |

### 7️⃣ 用户设置

**端点**: `/api/user/settings`

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|----------|------|------|
| 获取设置 | GET | `/api/user/settings` | 获取用户设置 |
| 更新设置 | PUT | `/api/user/settings` | 更新设置（主题、通知等） |
| 重置设置 | POST | `/api/user/settings/reset` | 恢复默认设置 |

---

## 📡 实时通信（WebSocket）

### WebSocket 服务架构

```typescript
// backend/src/websocket/server.ts

WebSocket Server
├── 连接管理
│   ├── handleConnection(socket)
│   ├── handleDisconnection(socket)
│   └── getOnlineUsers()
│
├── 房间事件
│   ├── join_room       // 加入房间
│   ├── user_joined     // 用户已加入（广播）
│   ├── chat_message    // 发送群聊消息
│   ├── message_sent    // 消息已发送（确认）
│   ├── user_left       // 用户离开（广播）
│   └── room_updated    // 房间信息更新
│
├── 私信事件
│   ├── direct_message  // 发送私信
│   ├── message_notification  // 私信通知
│   └── conversation_list  // 更新会话列表
│
├── 输入状态事件
│   ├── typing_start / user_typing  // 用户开始输入
│   └── typing_end / user_stopped_typing  // 用户停止输入
│
└── 用户状态事件
    ├── get_online_users / online_users_list  // 在线用户列表
    ├── user_online     // 用户上线
    └── user_offline    // 用户下线
```

### 消息类型详解

#### 1. 房间事件

**join_room** - 加入房间
```json
{
  "type": "join_room",
  "roomId": "room_123",
  "userId": "user_456"
}
```

**user_joined** - 广播用户加入
```json
{
  "type": "user_joined",
  "roomId": "room_123",
  "userId": "user_456",
  "username": "Alice",
  "avatar": "https://..."
}
```

**chat_message** - 发送群聊消息
```json
{
  "type": "chat_message",
  "roomId": "room_123",
  "sender": "user_456",
  "content": "Hello everyone!",
  "contentType": "text",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. 私信事件

**direct_message** - 发送私信
```json
{
  "type": "direct_message",
  "receiver": "user_789",
  "sender": "user_456",
  "content": "Hi, how are you?",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3. 输入状态事件

**typing_start** - 用户开始输入
```json
{
  "type": "typing_start",
  "roomId": "room_123",
  "userId": "user_456",
  "username": "Alice"
}
```

**typing_end** - 用户停止输入
```json
{
  "type": "typing_end",
  "roomId": "room_123",
  "userId": "user_456"
}
```

#### 4. 用户状态事件

**online_users_list** - 在线用户列表
```json
{
  "type": "online_users_list",
  "users": [
    {
      "userId": "user_123",
      "username": "Alice",
      "avatar": "https://...",
      "status": "online"
    },
    {
      "userId": "user_456",
      "username": "Bob",
      "avatar": "https://...",
      "status": "online"
    }
  ]
}
```

### 前端 WebSocket 集成

**文件**: `frontend/src/hooks/useWebSocket.ts`

```typescript
// 使用示例
const { socket, isConnected, sendMessage, joinRoom } = useWebSocket();

// 加入房间
joinRoom(roomId);

// 发送消息
sendMessage({
  type: 'chat_message',
  content: 'Hello!',
  roomId: roomId
});

// 监听消息
socket?.on('message_sent', (data) => {
  console.log('Message received:', data);
});
```

---

## 📚 API 文档

### 认证 API

#### 注册

**请求**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**响应** (成功):
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "userId": "user_123",
    "username": "alice",
    "email": "alice@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 登录

**请求**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "SecurePass123!"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "userId": "user_123",
    "username": "alice",
    "email": "alice@example.com",
    "avatar": "https://...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

#### 获取用户资料

**请求**:
```http
GET /api/auth/profile
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "username": "alice",
    "email": "alice@example.com",
    "avatar": "https://...",
    "status": "online",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 房间 API

#### 创建房间

**请求**:
```http
POST /api/rooms/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "前端讨论区",
  "description": "React 和 Next.js 讨论",
  "isPublic": true,
  "maxMembers": 50
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "roomId": "room_123",
    "name": "前端讨论区",
    "owner": "user_123",
    "members": ["user_123"],
    "isPublic": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 获取房间列表

**请求**:
```http
GET /api/rooms/my-rooms?page=1&limit=10
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "roomId": "room_123",
        "name": "前端讨论区",
        "description": "React 和 Next.js 讨论",
        "memberCount": 12,
        "avatar": "https://...",
        "isPublic": true,
        "lastMessageTime": "2024-01-15T10:30:00Z"
      }
    ],
    "totalPages": 5,
    "currentPage": 1
  }
}
```

#### 加入房间

**请求**:
```http
POST /api/rooms/room_123/join
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "message": "成功加入房间",
  "data": {
    "roomId": "room_123",
    "members": ["user_123", "user_456", "user_789"]
  }
}
```

### 消息 API

#### 发送房间消息

**请求**:
```http
POST /api/room-messages/room_123/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Hello, everyone!",
  "type": "text"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "messageId": "msg_123",
    "roomId": "room_123",
    "sender": "user_123",
    "senderName": "Alice",
    "content": "Hello, everyone!",
    "type": "text",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### 获取房间消息历史

**请求**:
```http
GET /api/room-messages/room_123/messages?page=1&limit=50
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "messageId": "msg_123",
        "sender": "user_123",
        "senderName": "Alice",
        "senderAvatar": "https://...",
        "content": "Hello!",
        "type": "text",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 100,
    "currentPage": 1
  }
}
```

### 私信 API

#### 发送私信

**请求**:
```http
POST /api/direct-messages/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "receiver": "user_456",
  "content": "Hi Bob, how are you?",
  "type": "text"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "messageId": "dm_123",
    "sender": "user_123",
    "receiver": "user_456",
    "content": "Hi Bob, how are you?",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### 获取会话列表

**请求**:
```http
GET /api/direct-messages/conversations?page=1&limit=20
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "conversationId": "conv_123",
        "otherUser": {
          "userId": "user_456",
          "username": "Bob",
          "avatar": "https://..."
        },
        "lastMessage": "Thanks, I'm doing great!",
        "lastMessageTime": "2024-01-15T11:00:00Z",
        "unreadCount": 2
      }
    ]
  }
}
```

#### 获取与某用户的私信历史

**请求**:
```http
GET /api/direct-messages/conversation/user_456?page=1&limit=50
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "messageId": "dm_123",
        "sender": "user_123",
        "senderName": "Alice",
        "content": "Hi Bob!",
        "timestamp": "2024-01-15T10:30:00Z",
        "isRead": true
      },
      {
        "messageId": "dm_124",
        "sender": "user_456",
        "senderName": "Bob",
        "content": "Hi Alice! How are you?",
        "timestamp": "2024-01-15T10:35:00Z",
        "isRead": true
      }
    ]
  }
}
```

### 上传 API

#### 上传用户头像

**请求**:
```http
POST /api/upload/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data

[文件数据]
```

**响应**:
```json
{
  "success": true,
  "data": {
    "url": "https://yourdomain.com/uploads/avatars/user_123_avatar.jpg",
    "filename": "user_123_avatar.jpg"
  }
}
```

#### 上传聊天图片

**请求**:
```http
POST /api/upload/message/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

[文件数据]
```

**响应**:
```json
{
  "success": true,
  "data": {
    "url": "https://yourdomain.com/uploads/messages/msg_123_image.jpg"
  }
}
```

---

## 🚀 快速开始

### 📋 前置要求

- **Node.js** >= 20.0（建议使用 LTS 版本）
- **MongoDB** >= 5.0（本地或云端实例，如 MongoDB Atlas）
- **npm** >= 10.0 或 **yarn** >= 3.0

### 🔐 环境变量配置

#### 后端环境变量

创建 `backend/.env.local` 文件：

```bash
# MongoDB 数据库连接
MONGODB_URI=mongodb://localhost:27017/chatapp
# 或使用云服务
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp

# JWT 配置
JWT_SECRET=your_very_secure_secret_key_here_min_32_chars!@#$%^&*
JWT_EXPIRY=86400                    # Token 有效期（秒）

# 服务器配置
PORT=5000
NODE_ENV=development

# CORS 配置
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880               # 5MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt
```

#### 前端环境变量

创建 `frontend/.env.local` 文件：

```bash
# API 和 WebSocket 服务器地址
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

**注**：Next.js 已在 `next.config.ts` 中配置了本地开发的代理，可以直接使用：

```typescript
// next.config.ts
const nextConfig = {
  rewrites: {
    async beforeFiles() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
        {
          source: '/socket',
          destination: 'ws://localhost:5000',
        },
      ];
    },
  },
};
```

### 🗄️ 数据库初始化

#### 本地 MongoDB 安装

**Windows:**
```bash
# 使用 Chocolatey 安装
choco install mongodb

# 或下载安装程序：https://www.mongodb.com/try/download/community
```

**macOS:**
```bash
# 使用 Homebrew 安装
brew tap mongodb/brew
brew install mongodb-community

# 启动 MongoDB
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
# 安装 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# 启动 MongoDB
systemctl start mongod
```

#### 使用 MongoDB Atlas (云服务)

1. 访问 https://www.mongodb.com/cloud/atlas
2. 注册并创建免费集群
3. 获取连接字符串，格式如下：
```
mongodb+srv://username:password@cluster-name.mongodb.net/chatapp?retryWrites=true&w=majority
```
4. 将连接字符串设置到 `MONGODB_URI` 环境变量

### ▶️ 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 编译 TypeScript（开发时可跳过）
npm run build

# 4. 启动开发服务器
npm run dev

# 输出应显示：
# Server running on http://localhost:5000
# WebSocket server running on ws://localhost:5000
```

**生产环境启动**:
```bash
npm run build
npm run start
```

### 🎨 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 输出应显示：
# > next dev
# ▲ Next.js 16.0.0
# - Ready in 2.5s
# - Local: http://localhost:3000
```

**访问应用**:
- 打开浏览器访问 `http://localhost:3000`
- 注册新账户或使用演示账户登录
- 开始聊天！

### 📦 生产部署

#### Docker 部署（推荐）

**后端 Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

**前端 Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package*.json ./

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker Compose**:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: chatapp-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  backend:
    build: ./backend
    container_name: chatapp-backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://admin:password@mongodb:27017/chatapp?authSource=admin
      JWT_SECRET: your_secure_secret_key
      PORT: 5000
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    container_name: chatapp-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000
      NEXT_PUBLIC_WS_URL: ws://localhost:5000
    depends_on:
      - backend

volumes:
  mongodb_data:
```

**启动容器**:
```bash
docker-compose up -d
```

#### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 证书配置
    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;

    # 前端应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket {
        proxy_pass ws://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## 🔒 安全建议

### 🚨 敏感信息管理

**❌ 不安全做法**（不要在代码中硬编码）:
```typescript
// 不要这样做！
const JWT_SECRET = 'mysecretkey';
const MONGODB_URI = 'mongodb://user:pass@localhost:27017/chatapp';
```

**✅ 安全做法**（使用环境变量）:
```bash
# .env.local 文件
JWT_SECRET=aVeryLongRandomSecureKeyWith32CharsMinimum!@#$%^&*()
MONGODB_URI=mongodb+srv://secureuser:securepw@cluster.mongodb.net/chatapp
```

### 🛡️ JWT 安全

```typescript
// 使用强密钥
const JWT_SECRET = crypto.randomBytes(32).toString('hex');  // 64 个字符

// 设置合理的过期时间
const JWT_EXPIRY = 86400;  // 24 小时

// 实现 Token 刷新机制
POST /api/auth/refresh
Authorization: Bearer {refreshToken}
```

### 🔐 MongoDB 安全

```javascript
// 启用身份验证
MONGODB_URI=mongodb://username:password@host:27017/chatapp?authSource=admin

// 创建高权限用户
db.createUser({
  user: "chatapp_admin",
  pwd: "SecurePassword123!@#",
  roles: [{role: "dbOwner", db: "chatapp"}]
});

// 定期备份
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/chatapp" --out=/backups
```

### 📁 文件上传安全

```typescript
// 验证文件类型（MIME 类型 + 扩展名）
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];

// 限制文件大小
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB

// 生成随机文件名，防止路径遍历
const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}_${originalName}`;

// 隔离上传目录
const UPLOAD_DIR = path.join(__dirname, 'uploads');
```

### 🛡️ 认证和授权

```typescript
// 1. 密码强度验证
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
// 至少 8 个字符，包含大小写字母、数字和特殊符号

// 2. 防止暴力破解
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;  // 15 分钟

// 3. CORS 配置
const corsOptions = {
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 4. Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100,  // 限制 100 个请求
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);
```

### 🔔 WebSocket 安全

```typescript
// 1. 验证 WebSocket 连接
wss.on('connection', (ws, req) => {
  const token = req.headers['sec-websocket-protocol'];
  if (!verifyToken(token)) {
    ws.close(4001, 'Unauthorized');
    return;
  }
});

// 2. 验证消息来源
socket.on('chat_message', (data) => {
  const sender = getUserFromToken(socket.token);
  if (sender._id !== data.sender) {
    socket.disconnect(true);
    return;
  }
});

// 3. 速率限制
const messageQueue = new Map();
socket.on('chat_message', (data) => {
  const userId = socket.userId;
  const now = Date.now();
  
  if (!messageQueue.has(userId)) {
    messageQueue.set(userId, []);
  }
  
  const messages = messageQueue.get(userId);
  messages.push(now);
  
  // 检查 1 秒内的消息数
  const recent = messages.filter(t => now - t < 1000);
  if (recent.length > 10) {
    socket.emit('error', 'Too many messages');
    return;
  }
});
```

### 📝 部署检查清单

- [ ] 所有敏感信息使用环境变量
- [ ] 启用 HTTPS/TLS
- [ ] 配置 CORS 白名单
- [ ] 启用 MongoDB 身份验证和授权
- [ ] 设置数据库备份计划
- [ ] 启用 API 速率限制
- [ ] 验证文件上传安全
- [ ] 配置日志和监控
- [ ] 定期更新依赖包
- [ ] 启用 WebSocket 连接验证
- [ ] 设置 JWT Token 刷新机制
- [ ] 实现请求验证和清理

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发工作流

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交变更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 后端: 遵循 Google TypeScript 代码规范
- 前端: 遵循 Airbnb JavaScript 代码规范
- 提交信息使用英文，清晰描述变更内容
- 确保代码通过 ESLint 和 TypeScript 检查

---

## 📄 开源协议

本项目采用 **MIT License** 开源协议。

```
MIT License

Copyright (c) 2024 ChatApp Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

详见 [LICENSE](LICENSE) 文件。

---

## 📞 联系方式

- GitHub: [@beiheng127](https://github.com/beiheng127)
- Issues: [GitHub Issues](https://github.com/beiheng127/chatapp/issues)

---

## 🙏 致谢

感谢以下优秀项目的支持：

- [Next.js](https://nextjs.org/) - React 全栈框架
- [Express.js](https://expressjs.com/) - Node.js Web 框架
- [MongoDB](https://www.mongodb.com/) - NoSQL 数据库
- [WebSocket (ws)](https://github.com/websockets/ws) - WebSocket 库
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
- [Ant Design](https://ant.design/) - UI 组件库

---

## 优化的项目描述

### 原描述
一个包含前后端的实时聊天应用，支持房间群聊与私信、文件上传、在线状态与输入中提示。前端基于 Next.js App Router，后端基于 Express + MongoDB，并使用 WebSocket 实现实时通信。

### 优化后的描述

**ChatApp** 是一个现代化的全栈实时聊天平台，以 WebSocket 实时通信为核心，提供完整的社交聊天体验。

**核心优势**:
- ✨ **低延迟���信** - WebSocket 秒级消息传递，相比 HTTP 轮询延迟降低 90% 以上
- 🏠 **灵活的房间系统** - 支持公开/私有房间，多人群聊，完整的房间管理功能
- 💬 **一对一私聊** - 独立的私信系统，支持未读计数和已读状态管理
- 📁 **丰富的文件支持** - 支持头像、图片、文档上传，支持多种文件类型
- 🟢 **完整的用户状态** - 实时在线状态显示，输入中/停止输入提示，增强交互体验
- 🔐 **生产级安全** - JWT 认证、数据验证、文件类型检查、速率限制等全面防护

**技术架构**:
- **前端**: Next.js 16 + React 19（App Router）+ Zustand + Ant Design，提供高效的页面性能和优美的用户界面
- **后端**: Express 5 + TypeScript + Mongoose，构建可维护和可扩展的 REST API
- **实时通信**: ws WebSocket 库，实现毫秒级消息推送和状态同步
- **数据库**: MongoDB，灵活的 NoSQL 存储方案，支持高并发

**适用场景**:
- 企业内部即时通讯平台
- 在线社区和论坛
- 实时客服系统
- 多人协作工具
- 游戏内聊天系统

---

<div align="center">

**⭐ 如果觉得有帮助，请给个 Star 支持一下！**

Made with ❤️ by ChatApp Contributors

</div>
