// frontend/src/app/(chat)/direct/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Avatar, 
  Typography, 
  Input, 
  Button, 
  Badge, 
  Empty,
  Skeleton,
  Modal,
  Form,
  message,
  Tooltip,
  Space,
  Image,
  Progress,
  Divider,
  Tag,
  FloatButton,
  theme,
  Grid,
} from 'antd';
import { 
  UserOutlined, 
  SearchOutlined,
  SendOutlined,
  PlusOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PaperClipOutlined,
  PictureOutlined,
  FileOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, type Message } from '@/store/chatStore';
import { directMessageService, type Conversation } from '@/services/directMessageService';
import { userService, type UserProfile } from '@/services/userService';
import { useWebSocket } from '@/hooks/useWebSocket';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;
const { Search, TextArea } = Input;
const { useBreakpoint } = Grid;

interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
}

// 按日期分组消息的接口
interface DateGroupedMessages {
  [date: string]: Message[];
}

export default function DirectChatPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchUsersLoading, setSearchUsersLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [form] = Form.useForm();
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [previewImage, setPreviewImage] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: ''
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const conversationListRef = useRef<HTMLDivElement>(null);
  
  const { token } = theme.useToken();
  
  const { messages, addMessage, setMessages, updateMessage, removeMessage, clearMessages } = useChatStore();
  const { sendDirectMessage: wsSendDirectMessage } = useWebSocket();

  // 安全的浏览器API函数
  const safeWindowOpen = (url: string, target?: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, target || '_blank');
    }
  };

  const safeDownloadFile = (url: string, filename: string) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
      setShowScrollToBottom(false);
    }
  }, []);

  // 检查是否需要显示滚动到底部按钮
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // 如果距离底部超过300px，显示滚动到底部按钮
    setShowScrollToBottom(distanceFromBottom > 300);
  }, []);

  // 更新容器高度
  const updateContainerHeight = useCallback(() => {
    if (typeof window !== 'undefined') {
      const height = window.innerHeight - 280; // 减去头部和边距
      setContainerHeight(height);
    }
  }, []);

  // 加载对话列表
  const loadConversations = async () => {
    try {
      setLoading(true);
      const result = await directMessageService.getConversations();
      
      console.log('对话列表API响应:', result);
      
      if (result.success && result.data) {
        // 确保数据格式正确
        const validConversations = result.data
          .filter((conv: Conversation) => conv && conv.userId && conv.username)
          .map((conv: Conversation) => ({
            ...conv,
            lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : new Date(),
            unreadCount: Number(conv.unreadCount) || 0,
            avatar: conv.avatar || ''
          }));
        
        console.log('格式化后的对话列表:', validConversations);
        setConversations(validConversations);
      } else {
        console.error('API返回失败:', result);
        messageApi.error(result.message || '加载对话列表失败');
      }
    } catch (error) {
      console.error('加载对话列表失败:', error);
      messageApi.error('加载对话列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    
    setSearchUsersLoading(true);
    try {
      const result = await userService.searchUsers(query);
      if (result.success && result.data) {
        const conversationUserIds = new Set(conversations.map(c => c.userId));
        const filteredUsers = result.data.filter(u => 
          u._id !== user?.id && !conversationUserIds.has(u._id)
        );
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
      messageApi.error('搜索用户失败');
    } finally {
      setSearchUsersLoading(false);
    }
  };

  // 开始新对话
  const startNewChat = async (userId: string) => {
    try {
      const existingConversation = conversations.find(c => c.userId === userId);
      
      if (existingConversation) {
        setActiveChat(userId);
        if (isMobile) setShowChatOnMobile(true);
        clearMessages(); // 清除之前的消息
        await loadMessages(userId);
      } else {
        const userToChat = users.find(u => u._id === userId);
        if (userToChat) {
          const newConversation: Conversation = {
            userId: userToChat._id,
            username: userToChat.username,
            avatar: userToChat.avatar || '',
            lastMessage: '开始对话',
            lastMessageTime: new Date(),
            unreadCount: 0,
          };
          setConversations(prev => [newConversation, ...prev]);
          setActiveChat(userId);
          if (isMobile) setShowChatOnMobile(true);
          clearMessages();
        }
      }
      setShowUserSearch(false);
      form.resetFields();
      setUsers([]);
    } catch (error) {
      console.error('开始对话失败:', error);
      messageApi.error('开始对话失败');
    }
  };

  // 加载消息
  const loadMessages = async (userId: string, loadMore = false) => {
    if (!userId || !user) return;
    
    try {
      if (loadMore) {
        setLoadingMoreMessages(true);
      } else {
        setLoading(true);
      }

      // 获取最早的消息的时间戳用于分页（注意：现在是时间升序，所以最早的消息是第一条）
      const currentMessagesForUser = getMessagesForUser(userId);
      const oldestMessage = currentMessagesForUser[0]; // 第一条消息是最早的
      const before = oldestMessage?.timestamp.toISOString();
      
      if (loadMore && !hasMoreMessages) return;

      const result = await directMessageService.getConversation(
        userId,
        loadMore ? 30 : 50,
        loadMore && before ? before : undefined
      );

      if (result.success && result.data) {
        const formattedMessages: Message[] = result.data.map(msg => ({
          id: msg._id,
          userId: msg.sender._id,
          content: msg.content,
          userName: msg.sender.username,
          senderAvatar: msg.sender.avatar,
          roomId: `direct_${userId}`,
          timestamp: new Date(msg.createdAt),
          type: msg.type,
          status: msg.read ? 'read' : 'sent',
          isRead: msg.read,
          isTemp: false,
          fileInfo: msg.fileInfo
        }));

        if (loadMore) {
          // 加载更多消息（更早的消息）
          const existingIds = new Set(currentMessagesForUser.map(m => m.id));
          const newMessages = formattedMessages.filter(msg => !existingIds.has(msg.id));
          
          // 合并消息，保持时间顺序（从旧到新）
          const allMessages = [...newMessages, ...currentMessagesForUser]
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          setMessages(allMessages);
          setHasMoreMessages(formattedMessages.length === 30);
        } else {
          // 首次加载，直接设置消息
          const sortedMessages = formattedMessages.sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
          );
          setMessages(sortedMessages);
          setHasMoreMessages(formattedMessages.length === 50);
          
          // 标记未读消息为已读
          const unreadMessages = result.data.filter(msg => 
            !msg.read && msg.receiver._id === user.id
          );

          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(msg => msg._id);
            
            await directMessageService.markMultipleAsRead(messageIds).catch(error => {
              console.warn('批量标记已读失败:', error);
            });

            unreadMessages.forEach(msg => {
              updateMessage(msg._id, { isRead: true, status: 'read' });
            });

            setConversations(prev => 
              prev.map(conv => 
                conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
              )
            );
          }
        }
        
        // 如果不是加载更多，滚动到底部
        if (!loadMore) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      messageApi.error('加载消息失败');
    } finally {
      if (loadMore) {
        setLoadingMoreMessages(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 获取当前活跃对话的消息（按时间升序）
  const getMessagesForUser = (userId: string): Message[] => {
    return messages
      .filter(msg => msg.roomId === `direct_${userId}`)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // 发送消息
  const sendMessage = async () => {
    if ((!messageInput.trim() && fileAttachments.length === 0) || !activeChat || !user || isSending) return;
    
    // 如果有附件，先上传所有附件
    let attachments: any[] = [];
    if (fileAttachments.length > 0) {
      try {
        attachments = await uploadAllAttachments();
      } catch (error) {
        messageApi.error('文件上传失败，请重试');
        return;
      }
    }
    
    // 发送文本消息或带附件的消息
    if (messageInput.trim() || attachments.length > 0) {
      const messageContent = messageInput.trim() || (attachments.length > 0 ? `[${attachments[0].type === 'image' ? '图片' : '文件'}]` : '');
      const tempId = directMessageService.generateTempId();
      
      // 检查重复
      if (directMessageService.isDuplicateMessage(messageContent, activeChat, 'text')) {
        messageApi.warning('请勿重复发送相同消息');
        return;
      }
      
      // 添加到待处理队列
      directMessageService.addPendingMessage(tempId, messageContent, activeChat, 'text');
      
      // 创建临时消息
      const tempMessage: Message = {
        id: tempId,
        userId: user.id,
        content: messageContent,
        userName: user.username,
        senderAvatar: user.avatar || '',
        roomId: `direct_${activeChat}`,
        timestamp: new Date(),
        type: 'text',
        status: 'sending',
        isTemp: true,
        fileInfo: attachments.length > 0 ? {
          name: attachments[0].filename,
          size: attachments[0].size,
          url: attachments[0].url,
          type: attachments[0].type,
        } : undefined
      };
      
      if (attachments.length > 0) {
        tempMessage.type = attachments[0].type;
      }
      
      // 添加到本地消息列表
      addMessage(tempMessage);
      setMessageInput('');
      setIsSending(true);
      
      try {
        // 发送到服务器
        const result = await directMessageService.sendMessage(
          activeChat, 
          messageContent, 
          attachments.length > 0 ? (attachments[0].type === 'image' ? 'image' : 'file') : 'text',
          attachments.length > 0 ? attachments[0] : undefined
        );
        
        if (result.success && result.data) {
          // 移除临时消息，添加服务器返回的消息
          directMessageService.removePendingMessage(messageContent, activeChat, 'text');
          removeMessage(tempId);
          
          const newMessage: Message = {
            id: result.data._id,
            userId: result.data.sender._id,
            content: result.data.content,
            userName: result.data.sender.username,
            senderAvatar: result.data.sender.avatar,
            roomId: `direct_${activeChat}`,
            timestamp: new Date(result.data.createdAt),
            type: result.data.type,
            status: result.data.read ? 'read' : 'sent',
            isRead: result.data.read,
            isTemp: false,
            fileInfo: result.data.fileInfo
          };
          
          addMessage(newMessage);
          
          // 通过WebSocket发送消息（携带真实ID）
          wsSendDirectMessage(activeChat, messageContent, {
            id: result.data._id,
            fromUserId: user.id,
            fromUsername: user.username,
            timestamp: new Date(result.data.createdAt).toISOString()
          });
          
          // 更新对话列表
          updateConversationAfterSend(activeChat, messageContent);
          
          // 清空附件
          setFileAttachments([]);
          
          // 滚动到底部
          setTimeout(() => scrollToBottom(), 100);
        } else {
          updateMessage(tempId, { status: 'failed' });
          messageApi.error(result.message || '发送失败');
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        updateMessage(tempId, { status: 'failed' });
        messageApi.error('发送消息失败');
      } finally {
        setIsSending(false);
      }
    }
  };

  // 上传所有附件
  const uploadAllAttachments = async (): Promise<any[]> => {
    const uploadedAttachments: any[] = [];
    
    for (const attachment of fileAttachments) {
      try {
        const isImage = attachment.type.startsWith('image/');
        const result = isImage 
          ? await directMessageService.uploadFile(attachment.file, 'image')
          : await directMessageService.uploadFile(attachment.file, 'file');
        
        if (result.success && result.data) {
          const fileIcon = directMessageService.getFileIcon(attachment.name);
          
          uploadedAttachments.push({
            url: result.data.url,
            filename: attachment.name,
            size: attachment.size,
            type: isImage ? 'image' : 'file',
            icon: fileIcon
          });
          
          // 更新附件状态
          setFileAttachments(prev => 
            prev.map(item => 
              item.id === attachment.id 
                ? { 
                    ...item, 
                    status: 'success', 
                    progress: 100, 
                    url: result.data!.url 
                  }
                : item
            )
          );
        }
      } catch (error) {
        console.error('上传文件失败:', error);
        setFileAttachments(prev => 
          prev.map(item => 
            item.id === attachment.id 
              ? { ...item, status: 'error' }
              : item
          )
        );
        throw error;
      }
    }
    
    return uploadedAttachments;
  };

  // 选择文件
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    
    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading'
    }));
    
    setFileAttachments(prev => [...prev, ...newAttachments]);
    
    // 清空input以便再次选择
    input.value = '';
  };

  // 移除附件
  const removeAttachment = (id: string) => {
    setFileAttachments(prev => prev.filter(item => item.id !== id));
  };

  // 下载文件
  const downloadFile = (url: string, filename: string) => {
    safeDownloadFile(url, filename);
  };

  // 更新对话列表
  const updateConversationAfterSend = (userId: string, content: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.userId === userId 
          ? { 
              ...conv, 
              lastMessage: content,
              lastMessageTime: new Date(),
              unreadCount: 0,
            }
          : conv
      ).sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      )
    );
  };

  // 重试发送失败的消息
  const retrySendMessage = async (messageId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileInfo?: any) => {
    if (!activeChat || isSending) return;
    
    setIsSending(true);
    try {
      const result = await directMessageService.sendMessage(activeChat, content, type, fileInfo);
      
      if (result.success && result.data) {
        removeMessage(messageId);
        
        const newMessage: Message = {
          id: result.data._id,
          userId: result.data.sender._id,
          content: result.data.content,
          userName: result.data.sender.username,
          senderAvatar: result.data.sender.avatar,
          roomId: `direct_${activeChat}`,
          timestamp: new Date(result.data.createdAt),
          type: result.data.type,
          status: result.data.read ? 'read' : 'sent',
          isRead: result.data.read,
          isTemp: false,
          fileInfo: result.data.fileInfo
        };
        
        addMessage(newMessage);
        wsSendDirectMessage(activeChat, content);
        updateConversationAfterSend(activeChat, content);
      }
    } catch (error) {
      console.error('重发消息失败:', error);
      messageApi.error('重发消息失败');
    } finally {
      setIsSending(false);
    }
  };

  // 加载更多消息（滚动到顶部时）
  const loadMoreMessages = async () => {
    if (!activeChat || loadingMoreMessages || !hasMoreMessages) return;
    
    await loadMessages(activeChat, true);
  };

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop } = container;
    
    // 检查是否需要显示滚动到底部按钮
    checkScrollPosition();
    
    // 滚动到顶部时加载更多消息
    if (scrollTop === 0 && !loadingMoreMessages && hasMoreMessages) {
      loadMoreMessages();
    }
  }, [activeChat, loadingMoreMessages, hasMoreMessages, checkScrollPosition]);

  // 渲染消息内容
  const renderMessageContent = (msg: Message) => {
    if (msg.type === 'image' && msg.fileInfo?.url) {
      return (
        <div style={{ marginTop: '8px' }}>
          <Image
            width={200}
            src={msg.fileInfo.url}
            alt={msg.fileInfo.name || '图片'}
            placeholder={
              <div style={{ width: 200, height: 150, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LoadingOutlined />
              </div>
            }
            onClick={() => setPreviewImage({ visible: true, url: msg.fileInfo!.url! })}
            style={{ 
              cursor: 'pointer',
              borderRadius: '8px',
              maxWidth: '100%'
            }}
          />
          {msg.fileInfo.name && (
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {msg.fileInfo.name}
            </Text>
          )}
        </div>
      );
    }
    
    if (msg.type === 'file' && msg.fileInfo) {
      const isOwn = msg.userId === user.id;
      return (
        <div style={{ marginTop: '8px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '8px',
            background: isOwn ? 'rgba(255,255,255,0.2)' : token.colorFillTertiary,
            borderRadius: '6px',
            gap: '12px'
          }}>
            <div style={{ fontSize: '24px' }}>
              {directMessageService.getFileIcon(msg.fileInfo.name || '')}
            </div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', color: 'inherit' }}>
                {msg.fileInfo.name || '文件'}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {directMessageService.formatFileSize(msg.fileInfo.size || 0)}
              </Text>
            </div>
            {msg.fileInfo.url && (
              <Space>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<EyeOutlined />}
                  onClick={() => safeWindowOpen(msg.fileInfo!.url!)}
                />
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={() => downloadFile(msg.fileInfo!.url!, msg.fileInfo!.name || 'download')}
                />
              </Space>
            )}
          </div>
        </div>
      );
    }
    
    return <Text style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}>{msg.content}</Text>;
  };

  // 按日期分组消息
  const getGroupedMessages = (): DateGroupedMessages => {
    const currentMessages = getMessagesForUser(activeChat || '');
    
    return currentMessages.reduce((groups: DateGroupedMessages, message) => {
      const date = dayjs(message.timestamp).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  };

  // 格式化日期标题
  const formatDateTitle = (date: string): string => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    
    if (date === today) {
      return '今天';
    } else if (date === yesterday) {
      return '昨天';
    } else {
      return dayjs(date).format('YYYY年MM月DD日');
    }
  };

  // 触发文件选择
  const triggerFileInput = (type: 'file' | 'image') => {
    if (type === 'file' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (type === 'image' && imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  // 初始化
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const init = async () => {
      try {
        await loadConversations();
      } catch (error) {
        console.error('初始化失败:', error);
      }
    };
    
    init();
    updateContainerHeight();
    
    // 监听窗口大小变化
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateContainerHeight);
      return () => window.removeEventListener('resize', updateContainerHeight);
    }
  }, [isAuthenticated, user, router, updateContainerHeight]);

  // 切换对话时加载消息
  useEffect(() => {
    if (activeChat) {
      clearMessages();
      loadMessages(activeChat);
    }
  }, [activeChat]);

  // 监听消息变化，检查是否需要滚动到底部
  useEffect(() => {
    checkScrollPosition();
  }, [messages, checkScrollPosition]);

  if (!user) {
    return null;
  }

  const activeConversation = conversations.find(conv => conv.userId === activeChat);
  const groupedMessages = getGroupedMessages();
  const hasMessages = Object.keys(groupedMessages).length > 0;

  return (
    <>
      {contextHolder}
      
      {/* 图片预览模态框 */}
      <Modal
        open={previewImage.visible}
        footer={null}
        onCancel={() => setPreviewImage({ visible: false, url: '' })}
        width="auto"
        centered
        destroyOnHidden
      >
        <Image
          src={previewImage.url}
          alt="预览"
          style={{ maxWidth: '80vw', maxHeight: '80vh' }}
        />
      </Modal>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '8px' : '20px' }}>
        <Title level={isMobile ? 3 : 2}>私聊</Title>
        
        <div style={{ display: 'flex', gap: isMobile ? '0' : '24px', height: containerHeight || (isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 180px)') }}>
          {/* 左侧：对话列表 (移动端根据状态显示) */}
          {(!isMobile || !showChatOnMobile) && (
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>对话列表</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<PlusOutlined />} 
                      onClick={() => setShowUserSearch(true)}
                    >
                      {isMobile ? '' : '新对话'}
                    </Button>
                    <Button 
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={loadConversations}
                    />
                  </div>
                </div>
              }
              style={{ width: isMobile ? '100%' : '350px' }}
              styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
            >
            <div style={{ padding: '16px' }}>
              <Search
                placeholder="搜索对话..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </div>

            <div 
              ref={conversationListRef}
              style={{ 
                flex: 1, 
                overflowY: 'auto',
                padding: '0 16px 16px'
              }}
            >
              {loading ? (
                <div style={{ padding: '20px 0' }}>
                  {[1, 2, 3].map(i => (
                    <Skeleton active avatar paragraph={{ rows: 1 }} key={i} />
                  ))}
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.userId}
                    style={{
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: activeChat === conv.userId ? token.colorPrimaryBg : 'transparent',
                      borderRadius: '8px',
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '4px',
                      transition: 'background-color 0.3s',
                    }}
                    onClick={() => {
                      if (activeChat !== conv.userId) {
                        setActiveChat(conv.userId);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = activeChat === conv.userId ? token.colorPrimaryBgHover : token.colorFillTertiary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = activeChat === conv.userId ? token.colorPrimaryBg : 'transparent';
                    }}
                  >
                    <div style={{ marginRight: '12px' }}>
                      <Badge dot={conv.unreadCount > 0} color="green" offset={[-2, 32]}>
                        <Avatar src={conv.avatar} icon={<UserOutlined />} />
                      </Badge>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text strong style={{ fontSize: '14px' }}>{conv.username}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {dayjs(conv.lastMessageTime).format('HH:mm')}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <Text 
                          ellipsis 
                          style={{ 
                            fontSize: '13px', 
                            color: '#666',
                            maxWidth: '200px'
                          }}
                        >
                          {conv.lastMessage || '暂无消息'}
                        </Text>
                        {conv.unreadCount > 0 && (
                          <Badge 
                            count={conv.unreadCount} 
                            style={{ backgroundColor: '#ff4d4f' }} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <Empty description="暂无对话" style={{ padding: '40px 0' }} />
              )}
            </div>
          </Card>
          )}

          {/* 右侧：聊天区域 (移动端根据状态显示) */}
          {(!isMobile || showChatOnMobile) && (
            <Card
              style={{ flex: 1, height: '100%' }}
              title={
                activeConversation ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isMobile && (
                      <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => setShowChatOnMobile(false)}
                        style={{ padding: '0 4px' }}
                      />
                    )}
                    <Avatar src={activeConversation.avatar} size="small" />
                    <div>
                      <Text strong>{activeConversation.username}</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {activeConversation.unreadCount > 0 
                            ? `${activeConversation.unreadCount}条未读消息` 
                            : '在线'}
                        </Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  '选择对话开始聊天'
                )
              }
              extra={
                activeChat && (
                  <Button 
                    type="text" 
                    icon={<ReloadOutlined />}
                    onClick={() => loadMessages(activeChat)}
                    loading={loading}
                    size="small"
                  >
                    {!isMobile && '刷新'}
                  </Button>
                )
              }
              styles={{ body: { 
                padding: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative'
              } }}
            >
              {activeConversation ? (
                <>
                  {/* 消息列表容器 */}
                  <div 
                    ref={messagesContainerRef}
                    style={{ 
                      flex: 1,
                      overflowY: 'auto',
                      padding: isMobile ? '12px' : '16px',
                      position: 'relative'
                    }}
                    onScroll={handleScroll}
                  >
                    {/* 加载更多指示器 */}
                    {loadingMoreMessages && (
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <LoadingOutlined />
                      </div>
                    )}
                    
                    {hasMessages ? (
                      Object.entries(groupedMessages).map(([date, dateMessages]) => (
                        <div key={date}>
                          <Divider plain style={{ margin: '12px 0' }}>
                            <Tag color="default" style={{ fontSize: '10px' }}>
                              {formatDateTitle(date)}
                            </Tag>
                          </Divider>
                          
                          {dateMessages.map((msg) => {
                            const isOwn = msg.userId === user.id;
                            const isFailed = msg.status === 'failed';
                            
                            return (
                              <div
                                key={msg.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                                  marginBottom: isMobile ? '12px' : '16px',
                                  alignItems: 'flex-start'
                                }}
                              >
                                {!isOwn && (
                                  <Avatar 
                                    src={msg.senderAvatar} 
                                    size={isMobile ? 'small' : 'default'}
                                    style={{ marginRight: '8px', flexShrink: 0 }} 
                                  />
                                )}
                                
                                <div style={{ maxWidth: isMobile ? '85%' : '70%', minWidth: 0 }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: isOwn ? 'row-reverse' : 'row',
                                    alignItems: 'flex-start',
                                    width: '100%'
                                  }}>
                                    <div
                                      style={{
                                        background: isOwn ? token.colorPrimary : token.colorFillAlter,
                                        borderRadius: '12px',
                                        padding: isMobile ? '8px 10px' : '12px',
                                        position: 'relative',
                                        wordBreak: 'break-word',
                                        color: isOwn ? '#fff' : token.colorText,
                                        border: isFailed ? '1px solid #ff4d4f' : 'none',
                                        fontSize: isMobile ? '14px' : '14px'
                                      }}
                                    >
                                      {renderMessageContent(msg)}
                                      
                                      {/* 消息状态指示器 */}
                                      {isOwn && (
                                        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)' }}>
                                          {msg.status === 'sending' && <LoadingOutlined style={{ color: '#1890ff', fontSize: '12px' }} />}
                                          {msg.status === 'failed' && (
                                            <Tooltip title="发送失败，点击重试">
                                              <ExclamationCircleOutlined 
                                                style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: '12px' }} 
                                                onClick={() => retrySendMessage(msg.id, msg.content, msg.type as any, msg.fileInfo)}
                                              />
                                            </Tooltip>
                                          )}
                                          {msg.status === 'read' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '12px' }} />}
                                          {msg.status === 'sent' && <CheckCircleOutlined style={{ color: '#999', fontSize: '12px' }} />}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {isOwn && (
                                      <Avatar 
                                        src={user.avatar} 
                                        size="small"
                                        style={{ marginLeft: '8px', flexShrink: 0 }} 
                                      />
                                    )}
                                  </div>
                                  <Text
                                    type="secondary"
                                    style={{
                                      fontSize: '10px',
                                      marginTop: '4px',
                                      display: 'block',
                                      textAlign: isOwn ? 'right' : 'left',
                                      marginRight: isOwn ? '8px' : '0',
                                      marginLeft: !isOwn ? '8px' : '0'
                                    }}
                                  >
                                    {dayjs(msg.timestamp).format('HH:mm')}
                                  </Text>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty description="还没有消息，发送第一条消息开始聊天吧！" />
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                
                  {/* 附件预览 */}
                  {fileAttachments.length > 0 && (
                    <div style={{ padding: isMobile ? '8px 12px' : '8px 16px', borderTop: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
                      <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
                        {fileAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: token.colorFillAlter,
                              borderRadius: '6px',
                              padding: '6px 8px',
                              minWidth: '150px',
                              maxWidth: '200px',
                              flexShrink: 0
                            }}
                          >
                            {attachment.type.startsWith('image/') ? (
                              <PictureOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            ) : (
                              <FileOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text ellipsis style={{ fontSize: '11px' }}>
                                {attachment.name}
                              </Text>
                              {attachment.status === 'uploading' && (
                                <Progress percent={attachment.progress} size="small" showInfo={false} />
                              )}
                            </div>
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                              onClick={() => removeAttachment(attachment.id)}
                              style={{ color: '#ff4d4f', padding: '0 4px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 消息输入区域 */}
                  <div style={{ padding: isMobile ? '12px' : '16px', borderTop: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
                    <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: isMobile ? '0' : '4px' }}>
                        <Button 
                          type="text" 
                          icon={<PictureOutlined />}
                          onClick={() => triggerFileInput('image')}
                          disabled={isSending}
                          size={isMobile ? 'small' : 'middle'}
                        />
                        <Button 
                          type="text" 
                          icon={<PaperClipOutlined />}
                          onClick={() => triggerFileInput('file')}
                          disabled={isSending}
                          size={isMobile ? 'small' : 'middle'}
                        />
                        
                        {/* 隐藏的文件输入 */}
                        <input
                          type="file"
                          ref={imageInputRef}
                          style={{ display: 'none' }}
                          accept="image/*"
                          multiple
                          onChange={(e) => handleFileSelect(e, 'image')}
                        />
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          multiple
                          onChange={(e) => handleFileSelect(e, 'file')}
                        />
                      </div>
                      
                      <TextArea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={isMobile ? "消息..." : "输入消息..."}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        style={{ flex: 1, fontSize: isMobile ? '14px' : '14px' }}
                        disabled={isSending}
                        onPressEnter={(e) => {
                          if (!e.shiftKey && !isSending) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={sendMessage}
                        disabled={(!messageInput.trim() && fileAttachments.length === 0) || isSending}
                        loading={isSending}
                        style={{ height: isMobile ? '32px' : '40px' }}
                      >
                        {!isMobile && '发送'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty 
                    description="从左侧选择或开始一个新的对话" 
                    style={{ marginTop: isMobile ? '50px' : '100px' }} 
                  />
                </div>
              )}
            </Card>
          )}
        </div>
        
        {/* 浮动滚动到底部按钮 (移动端调小一点) */}
        {showScrollToBottom && showChatOnMobile && (
          <FloatButton
            icon={<DownOutlined />}
            onClick={scrollToBottom}
            type="primary"
            style={{
              right: isMobile ? 12 : 24,
              bottom: isMobile ? 80 : 100
            }}
          />
        )}
      </div>

      {/* 选择用户开始新对话的模态框 */}
      <Modal
        title="开始新对话"
        open={showUserSearch}
        onCancel={() => {
          setShowUserSearch(false);
          form.resetFields();
          setUsers([]);
        }}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item label="搜索用户" name="search">
            <Search
              placeholder="输入用户名或邮箱搜索"
              loading={searchUsersLoading}
              onSearch={(value) => searchUsers(value)}
              onChange={(e) => searchUsers(e.target.value)}
              allowClear
            />
          </Form.Item>
        </Form>
        
        {searchUsersLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Skeleton active />
          </div>
        ) : users.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {users.map((userItem) => (
              <div
                key={userItem._id}
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '8px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.3s',
                }}
                onClick={() => startNewChat(userItem._id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={userItem.avatar} 
                    icon={<UserOutlined />} 
                    style={{ marginRight: '12px' }} 
                  />
                  <div>
                    <Text strong>{userItem.username}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>{userItem.email}</Text>
                      {userItem.isOnline && (
                        <Tag color="green">在线</Tag>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  type="primary" 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    startNewChat(userItem._id);
                  }}
                >
                  发起对话
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="搜索用户开始对话" />
        )}
      </Modal>
    </>
  );
}