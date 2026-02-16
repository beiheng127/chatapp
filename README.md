# chatapp
- 一个包含前后端的实时聊天应用，支持房间群聊与私信、文件上传、在线状态与输入中提示。前端基于 Next.js App Router，后端基于 Express + MongoDB，并使用 WebSocket 实现实时通信。
- 前端技术栈：Next.js 16 + React 19、Ant Design、Zustand、styled-components（Tailwind 已配置依赖）。参考: frontend/package.json 、 next.config.ts 。
- 后端技术栈：TypeScript、Express 5、Mongoose、JWT、ws、multer、express-validator。参考: backend/package.json 、 server.ts 。
- 实时通信：基于 ws 的 WebSocket 服务，支持加入房间、群聊消息、私信、输入状态提示、在线用户列表等消息类型。参考: websocket/server.ts 。
核心特性

- 用户与认证
  - 注册、登录、退出；JWT 鉴权；获取与更新用户资料；在线用户列表。
  - 路由参考: routes/auth.ts 、 middleware/auth.ts 。
- 房间与消息
  - 创建/加入/离开/邀请/更新/删除房间，公共房间列表；房间消息查询与删除。
  - 路由参考: routes/room.ts 、 routes/roomMessage.ts 。
- 私信与会话
  - 发送私信、获取会话列表与会话详情、已读状态管理。
  - 路由参考: routes/directMessage.ts 。
- 文件与上传
  - 用户头像、消息图片/文件、通用/批量上传，房间头像上传。
  - 路由参考: routes/uploadRoutes.ts 。
- 实时体验
  - 基于 WebSocket 的房间加入、群聊消息、私信、输入中/结束输入广播、在线用户列表等。
  - 前端接入参考: useWebSocket.ts 。
目录结构

- 根目录
  - backend：Express + MongoDB + ws 后端。
    - src/controllers, src/routes, src/models, src/middleware, src/websocket
  - frontend：Next.js 前端（App Router）。
    - src/app（登录/注册、聊天、房间、个人资料、设置等页面）, src/components, src/store, src/services, src/hooks, public
- 参考文件
  - 后端入口: backend/server.ts
  - WebSocket: backend/src/websocket/server.ts
  - 前端配置: frontend/next.config.ts
主要 API 路由

- /api/auth：register、login、logout、profile（GET/PUT）、online-users
- /api/users：search、online、:userId
- /api/rooms：create、my-rooms、public、:roomId（GET/PUT/DELETE）、:roomId/join、:roomId/leave、:roomId/invite
- /api/room-messages：:roomId/messages（GET）、:roomId/send（POST）、message/:messageId（DELETE）
- /api/direct-messages：send、conversations、conversation/:userId、read/:messageId、read-multiple
- /api/upload：avatar、message/image、message/file、file、multiple
- /api/user/settings：GET、PUT、reset
对应实现可见:

- auth.ts
- user.ts
- room.ts
- roomMessage.ts
- directMessage.ts
- uploadRoutes.ts
- userSettings.ts
快速开始

- 前置依赖
  - Node.js 20+，MongoDB 实例（本地或远程）。
- 环境变量（示例）
  - 后端：MONGODB_URI、JWT_SECRET、PORT（默认 5000）
  - 前端：NEXT_PUBLIC_API_URL、NEXT_PUBLIC_WS_URL（next.config.ts 已提供本地默认值）
- 启动
  - 后端
    - cd backend && npm install
    - npm run dev（默认 http://localhost:5000 ）
  - 前端
    - cd frontend && npm install
    - npm run dev（默认 http://localhost:3000，已通过 rewrites 代理到后端 /api）
实时通信消息类型（部分）

- join_room、room_joined、user_joined、user_left
- chat_message、message_sent
- direct_message
- typing_start/user_typing、typing_end/user_stopped_typing
- get_online_users/online_users_list
实现参考: websocket/server.ts 与前端 useWebSocket.ts 。

开发者提示

- CORS 已允许 http://localhost:3000 与 :3001，可在 server.ts 调整。
- 前端通过 next.config.ts 将 /api 与 /socket 代理到后端，便于本地开发。
- 保护好 JWT_SECRET 等敏感信息，勿提交到版本库。
