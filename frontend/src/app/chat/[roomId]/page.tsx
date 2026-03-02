// app/(chat)/[roomId]/page.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Input,
  Button,
  Avatar,
  Typography,
  Divider,
  Tooltip,
  Dropdown,
  MenuProps,
  Modal,
  message,
  Skeleton,
  Empty,
  Image,
  Space,
  FloatButton,
  Progress,
  Tag,
  Badge,
  Spin,
  theme,
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  PictureOutlined,
  FileOutlined,
  MoreOutlined,
  UserAddOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  DownOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { roomMessageService, type RoomMessage } from '@/services/roomMessageService';
import { roomService, type Room } from '@/services/roomService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { TextArea } = Input;
const { Title, Text } = Typography;

// 文件附件接口
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

// 按日期分组的消息
interface DateGroupedMessages {
  [date: string]: RoomMessage[];
}

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { token } = theme.useToken();
  
  const [newMessage, setNewMessage] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [previewImage, setPreviewImage] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: ''
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshRate, setRefreshRate] = useState(30); // 默认30秒刷新一次
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RoomMessage[]>([]);
  const [searching, setSearching] = useState(false);
  
  const { user } = useAuthStore();
  const { 
    sendChatMessage: wsSendMessage, 
    isConnected 
  } = useWebSocket();

  // 安全的浏览器API函数
  const safeWindowOpen = useCallback((url: string, target?: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, target || '_blank');
    }
  }, []);

  const safeDownloadFile = useCallback((url: string, filename: string) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

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
    
    setShowScrollToBottom(distanceFromBottom > 300);
  }, []);

  // 更新容器高度
  const updateContainerHeight = useCallback(() => {
    if (typeof window !== 'undefined') {
      const height = window.innerHeight - 180; // 减去头部和边距
      setContainerHeight(height);
    }
  }, []);

  // 加载群聊详情
  const loadRoomDetails = useCallback(async () => {
    if (!roomId) return;
    
    try {
      const result = await roomService.getRoomDetails(roomId);
      if (result.success && result.data) {
        setRoom(result.data);
      } else {
        messageApi.error(result.message || '群聊不存在');
        router.push('/chat/rooms');
      }
    } catch (error) {
      console.error('加载群聊详情失败:', error);
      messageApi.error('加载群聊详情失败');
      router.push('/chat/rooms');
    }
  }, [roomId, router, messageApi]);

  // 加载消息历史
  const loadMessages = useCallback(async (loadMore = false) => {
    if (!roomId) return;
    
    try {
      if (loadMore) {
        setLoadingMoreMessages(true);
      } else {
        setLoading(true);
      }

      // 获取最早消息的时间戳用于分页
      const currentMessages = messages;
      const oldestMessage = currentMessages[0];
      const before = oldestMessage?.createdAt?.toISOString();
      
      if (loadMore && !hasMoreMessages) return;

      const result = await roomMessageService.getMessages(
        roomId,
        loadMore ? { before, limit: 30 } : { limit: 50 }
      );

      if (result.success && result.data) {
        const formattedMessages: RoomMessage[] = result.data.map(msg => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          updatedAt: new Date(msg.updatedAt)
        }));

        if (loadMore) {
          // 加载更多消息
          const existingIds = new Set(currentMessages.map(m => m._id));
          const newMessages = formattedMessages.filter(msg => !existingIds.has(msg._id));
          
          const allMessages = [...newMessages, ...currentMessages]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          
          setMessages(allMessages);
          setHasMoreMessages(formattedMessages.length === 30);
        } else {
          // 首次加载
          const sortedMessages = formattedMessages.sort((a, b) => 
            a.createdAt.getTime() - b.createdAt.getTime()
          );
          setMessages(sortedMessages);
          setHasMoreMessages(formattedMessages.length === 50);
          
          // 标记未读消息为已读
          const unreadMessages = result.data.filter(msg => 
            !msg.readBy.includes(user?.id || '')
          );

          if (unreadMessages.length > 0 && user) {
            const messageIds = unreadMessages.map(msg => msg._id);
            
            try {
              await roomMessageService.markMultipleAsRead(roomId, messageIds);
            } catch (error) {
              console.warn('标记已读失败:', error);
            }
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
  }, [roomId, user, messages, hasMoreMessages, messageApi, scrollToBottom]);

  // 发送消息
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && fileAttachments.length === 0) || !roomId || !user || sending) return;
    
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
    if (newMessage.trim() || attachments.length > 0) {
      const messageContent = newMessage.trim() || (attachments.length > 0 ? `[${attachments[0].type === 'image' ? '图片' : '文件'}]` : '');
      const tempId = roomMessageService.generateTempId();
      
      // 检查重复
      if (roomMessageService.isDuplicateMessage(messageContent, roomId, 'text')) {
        messageApi.warning('请勿重复发送相同消息');
        return;
      }
      
      // 添加到待处理队列
      roomMessageService.addPendingMessage(tempId, messageContent, roomId, 'text');
      
      // 创建临时消息
      const tempMessage: RoomMessage = {
        _id: tempId,
        room: roomId,
        sender: {
          _id: user.id,
          username: user.username,
          avatar: user.avatar || ''
        },
        content: messageContent,
        type: attachments.length > 0 ? (attachments[0].type === 'image' ? 'image' : 'file') : 'text',
        readBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileInfo: attachments.length > 0 ? {
          name: attachments[0].filename,
          size: attachments[0].size,
          url: attachments[0].url,
          type: attachments[0].type,
          icon: attachments[0].icon
        } : undefined
      };
      
      // 添加到本地消息列表
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      setSending(true);
      
      try {
        const sendData: any = {
          content: messageContent,
          type: attachments.length > 0 ? (attachments[0].type === 'image' ? 'image' : 'file') : 'text'
        };
        
        if (attachments.length > 0) {
          sendData.fileInfo = attachments[0];
        }
        
        const result = await roomMessageService.sendMessage(roomId, sendData);
        
        if (result.success && result.data) {
          // 移除临时消息，添加服务器返回的消息
          roomMessageService.removePendingMessage(messageContent, roomId, 'text');
          setMessages(prev => prev.filter(msg => msg._id !== tempId));
          
          const newMessageData: RoomMessage = {
            ...result.data,
            createdAt: new Date(result.data.createdAt),
            updatedAt: new Date(result.data.updatedAt)
          };
          
          setMessages(prev => [...prev, newMessageData]);
          
          // 通过WebSocket发送消息
          if (isConnected) {
            wsSendMessage(roomId, messageContent);
          }
          
          // 清空附件
          setFileAttachments([]);
          
          // 滚动到底部
          setTimeout(() => scrollToBottom(), 100);
        } else {
          // 更新消息状态为失败
          setMessages(prev => prev.map(msg => 
            msg._id === tempId ? { ...msg, status: 'failed' } as any : msg
          ));
          messageApi.error(result.message || '发送失败');
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        setMessages(prev => prev.map(msg => 
          msg._id === tempId ? { ...msg, status: 'failed' } as any : msg
        ));
        messageApi.error('发送消息失败');
      } finally {
        setSending(false);
      }
    }
  };

  // 上传所有附件
  const uploadAllAttachments = async (): Promise<any[]> => {
    const uploadedAttachments: any[] = [];
    
    for (const attachment of fileAttachments) {
      try {
        const isImage = attachment.type.startsWith('image/');
        const result = await roomMessageService.uploadFile(
          roomId,
          attachment.file,
          isImage ? 'image' : 'file',
          (percent) => {
            setFileAttachments(prev => 
              prev.map(item => 
                item.id === attachment.id 
                  ? { ...item, progress: percent }
                  : item
              )
            );
          }
        );
        
        if (result.success && result.data) {
          const fileIcon = roomMessageService.getFileIcon(attachment.name);
          
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
                    url: result.data?.url 
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

  // 搜索消息
  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const result = await roomMessageService.searchMessages(roomId, searchQuery);
      if (result.success && result.data) {
        setSearchResults(result.data.messages);
      }
    } catch (error) {
      console.error('搜索消息失败:', error);
      messageApi.error('搜索消息失败');
    } finally {
      setSearching(false);
    }
  };

  // 重试发送失败的消息
  const retrySendMessage = async (messageId: string, content: string, type: 'text' | 'image' | 'file' | 'voice' = 'text', fileInfo?: any) => {
    if (!roomId || sending) return;
    
    setSending(true);
    try {
      const sendData: any = { content, type };
      if (fileInfo) {
        sendData.fileInfo = fileInfo;
      }
      
      const result = await roomMessageService.sendMessage(roomId, sendData);
      
      if (result.success && result.data) {
        // 移除失败的消息，添加成功发送的消息
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        
        const newMessageData: RoomMessage = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt)
        };
        
        setMessages(prev => [...prev, newMessageData]);
        
        if (isConnected) {
          wsSendMessage(roomId, content);
        }
        
        messageApi.success('消息重新发送成功');
      }
    } catch (error) {
      console.error('重发消息失败:', error);
      messageApi.error('重发消息失败');
    } finally {
      setSending(false);
    }
  };

  // 加载更多消息
  const loadMoreMessages = async () => {
    if (!roomId || loadingMoreMessages || !hasMoreMessages) return;
    
    await loadMessages(true);
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
  }, [loadingMoreMessages, hasMoreMessages, checkScrollPosition]);

  // 渲染消息内容
  const renderMessageContent = (msg: RoomMessage) => {
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
      return (
        <div style={{ marginTop: '8px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '6px',
            gap: '12px'
          }}>
            <div style={{ fontSize: '24px' }}>
              {msg.fileInfo.icon || roomMessageService.getFileIcon(msg.fileInfo.name || '')}
            </div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', color: 'inherit' }}>
                {msg.fileInfo.name || '文件'}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {roomMessageService.formatFileSize(msg.fileInfo.size || 0)}
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
                  onClick={() => safeDownloadFile(msg.fileInfo!.url!, msg.fileInfo!.name || 'download')}
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
    return messages.reduce((groups: DateGroupedMessages, message) => {
      const date = dayjs(message.createdAt).format('YYYY-MM-DD');
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

  // 设置自动刷新
  const setupAutoRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    if (autoRefresh && refreshRate > 0) {
      const interval = setInterval(() => {
        if (!loading && roomId) {
          loadRoomDetails();
          loadMessages();
        }
      }, refreshRate * 1000);

      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshRate, roomId, loading]);

  // 离开群聊
  const handleLeaveRoom = async () => {
    if (!roomId) return;
    
    Modal.confirm({
      title: '确认退出群聊',
      content: `确定要退出 "${room?.name}" 群聊吗？`,
      okText: '确定退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await roomService.leaveRoom(roomId);
          if (result.success) {
            messageApi.success('已退出群聊');
            router.push('/chat/rooms');
          } else {
            messageApi.error(result.message || '退出失败');
          }
        } catch (error) {
          console.error('退出群聊失败:', error);
          messageApi.error('退出群聊失败');
        }
      },
    });
  };

  // 更多操作菜单
  const moreActions: MenuProps['items'] = [
    { 
      key: 'refresh', 
      label: '刷新消息', 
      icon: <ReloadOutlined />,
      onClick: () => loadMessages()
    },
    { 
      key: 'search', 
      label: '搜索消息', 
      icon: <SearchOutlined />,
      onClick: () => setShowSearch(true)
    },
    { type: 'divider' },
    { 
      key: 'info', 
      label: '群聊信息', 
      icon: <InfoCircleOutlined />,
      onClick: () => router.push(`/chat/${roomId}/info`)
    },
    { 
      key: 'settings', 
      label: '群聊设置', 
      icon: <SettingOutlined />,
      onClick: () => router.push(`/chat/${roomId}/settings`)
    },
    { 
      key: 'invite', 
      label: '邀请成员', 
      icon: <UserAddOutlined />,
      onClick: () => router.push(`/chat/${roomId}/invite`)
    },
    { type: 'divider' },
    { 
      key: 'leave', 
      label: '退出群聊', 
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLeaveRoom
    },
  ];

  // 初始化
  useEffect(() => {
    if (!roomId) return;

    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([loadRoomDetails(), loadMessages()]);
      } catch (error) {
        console.error('初始化失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
    updateContainerHeight();
    
    // 监听窗口大小变化
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateContainerHeight);
      return () => window.removeEventListener('resize', updateContainerHeight);
    }
  }, [roomId]);

  // 设置自动刷新
  useEffect(() => {
    setupAutoRefresh();
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [setupAutoRefresh]);

  // 监听WebSocket消息
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      const wsMessage = event.detail;
      
      if (wsMessage.roomId === roomId) {
        const newMessage: RoomMessage = {
          _id: wsMessage.id || `ws_${Date.now()}`,
          room: roomId,
          sender: {
            _id: wsMessage.userId,
            username: wsMessage.username || '未知用户',
            avatar: wsMessage.avatar || '',
          },
          content: wsMessage.content,
          type: 'text',
          readBy: [],
          createdAt: new Date(wsMessage.timestamp),
          updatedAt: new Date(wsMessage.timestamp)
        };
        
        setMessages(prev => {
          const messageExists = prev.some(msg => 
            msg._id === newMessage._id || 
            (msg.content === newMessage.content && 
             msg.sender._id === newMessage.sender._id &&
             Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 1000)
          );
          
          if (!messageExists) {
            return [...prev, newMessage];
          }
          return prev;
        });
      }
    };

    window.addEventListener('websocket-chat-message', handleWebSocketMessage);
    
    return () => {
      window.removeEventListener('websocket-chat-message', handleWebSocketMessage);
    };
  }, [roomId]);

  // 检查是否需要滚动到底部
  useEffect(() => {
    checkScrollPosition();
  }, [messages, checkScrollPosition]);

  if (loading && !room) {
    return (
      <div style={{ padding: '40px' }}>
        <Skeleton active />
      </div>
    );
  }

  if (!room) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <Title level={3}>群聊不存在</Title>
        <Text type="secondary">请选择一个有效的群聊</Text>
        <div style={{ marginTop: '20px' }}>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/chat/rooms')}
          >
            返回群聊列表
          </Button>
        </div>
      </Card>
    );
  }

  // 检查用户是否是群成员
  const isMember = room.members?.some(member => member._id === user?.id);

  if (!isMember && room.isPrivate) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <Title level={3}>无法访问</Title>
        <Text type="secondary">您不是该私密群聊的成员</Text>
        <div style={{ marginTop: '20px' }}>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/chat/rooms')}
          >
            返回群聊列表
          </Button>
        </div>
      </Card>
    );
  }

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
        destroyOnClose
      >
        <Image
          src={previewImage.url}
          alt="预览"
          style={{ maxWidth: '80vw', maxHeight: '80vh' }}
        />
      </Modal>
      
      {/* 搜索消息模态框 */}
      <Modal
        title="搜索消息"
        open={showSearch}
        onCancel={() => {
          setShowSearch(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入搜索关键词"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearchMessages}
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={handleSearchMessages}
              loading={searching}
            >
              搜索
            </Button>
          </Space.Compact>
        </div>
        
        {searching ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
            <div style={{ marginTop: '16px' }}>搜索中...</div>
          </div>
        ) : searchResults.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {searchResults.map((msg) => (
              <Card
                key={msg._id}
                size="small"
                style={{ marginBottom: '8px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar 
                    size="small" 
                    src={msg.sender.avatar} 
                    style={{ marginRight: '8px' }} 
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{msg.sender.username}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(msg.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </div>
                    <Text style={{ marginTop: '4px' }}>{msg.content}</Text>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <Empty description="未找到相关消息" />
        ) : null}
      </Modal>
      
      <div style={{ height: 'calc(90vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* 群聊头部 */}
        <div style={{ 
          padding: '16px 24px', 
          background: token.colorBgContainer, 
          borderBottom: `1px solid ${token.colorBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar 
              size="large" 
              src={room.avatar && !room.avatar.includes('default') ? room.avatar : undefined}
              icon={<TeamOutlined />}
              style={{ backgroundColor: room.isPrivate ? '#ff4d4f' : '#1890ff' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Title level={4} style={{ margin: 0, color: token.colorText }}>{room.name}</Title>
                {room.isPrivate ? (
                  <Tooltip title="私密群聊">
                    <Tag color="red">私密</Tag>
                  </Tooltip>
                ) : (
                  <Tooltip title="公开群聊">
                    <Tag color="blue">公开</Tag>
                  </Tooltip>
                )}
                {isConnected && (
                  <Tooltip title="WebSocket已连接">
                    <Badge status="success" text={<span style={{ color: token.colorTextSecondary }}>在线</span>} />
                  </Tooltip>
                )}
              </div>
              <Text type="secondary" style={{ color: token.colorTextSecondary }}>
                {room.memberCount || room.members?.length || 0} 名成员
              </Text>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 自动刷新设置 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tooltip title={`自动刷新: ${autoRefresh ? '开启' : '关闭'}`}>
                <Tag 
                  color={autoRefresh ? 'green' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <ClockCircleOutlined /> {refreshRate}秒
                </Tag>
              </Tooltip>
            </div>
            
            <Dropdown menu={{ items: moreActions }} placement="bottomRight">
              <Button type="text" icon={<MoreOutlined style={{ color: token.colorText }} />} />
            </Dropdown>
          </div>
        </div>

        {/* 消息列表容器 */}
        <div 
          ref={messagesContainerRef}
          style={{ 
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            height: containerHeight || 'calc(100vh - 180px)'
          }}
          onScroll={handleScroll}
        >
          {/* 加载更多指示器 */}
          {loadingMoreMessages && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Spin size="small" />
              <Text type="secondary"> 加载历史消息...</Text>
            </div>
          )}
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ) : hasMessages ? (
            <>
              {/* 消息内容 - 按日期分组 */}
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <Divider>
                    <Tag color="blue">
                      {formatDateTitle(date)}
                    </Tag>
                  </Divider>
                  
                  {dateMessages.map((msg) => {
                    const isOwn = msg.sender._id === user?.id;
                    const isFailed = (msg as any).status === 'failed';
                    
                    return (
                      <div
                        key={msg._id}
                        style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          marginBottom: '16px',
                          alignItems: 'flex-start'
                        }}
                      >
                        {!isOwn && (
                          <Avatar 
                            src={msg.sender.avatar} 
                            style={{ marginRight: '8px', alignSelf: 'flex-start' }} 
                          />
                        )}
                        
                        <div style={{ maxWidth: '70%' }}>
                          {!isOwn && (
                            <Text strong style={{ marginLeft: '8px', fontSize: '12px' }}>
                              {msg.sender.username}
                            </Text>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: isOwn ? 'row-reverse' : 'row',
                            alignItems: 'flex-start'
                          }}>
                            <div
                              style={{
                                background: isFailed ? '#fff2f0' : (isOwn ? 'var(--primary-color)' : 'var(--hover-color)'),
                                border: isFailed ? '1px solid #ffccc7' : 'none',
                                borderRadius: '12px',
                                padding: '12px',
                                maxWidth: '100%',
                                position: 'relative',
                                wordBreak: 'break-word'
                              }}
                            >
                              {renderMessageContent(msg)}
                              
                              {/* 消息状态指示器 */}
                              {isOwn && (
                                <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)' }}>
                                  {(msg as any).status === 'failed' && (
                                    <Tooltip title="发送失败，点击重试">
                                      <ExclamationCircleOutlined 
                                        style={{ color: '#ff4d4f', cursor: 'pointer' }} 
                                        onClick={() => {
                                          if (msg.type !== 'system') {
                                            retrySendMessage(msg._id, msg.content, msg.type as any, msg.fileInfo);
                                          }
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                  
                                  {(msg as any).status !== 'failed' && msg.readBy?.length > 0 && (
                                    <Tooltip title="已读">
                                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    </Tooltip>
                                  )}
                                  
                                  {(msg as any).status !== 'failed' && (!msg.readBy || msg.readBy.length === 0) && (
                                    <Tooltip title="已发送">
                                      <CheckCircleOutlined style={{ color: '#999' }} />
                                    </Tooltip>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {isOwn && (
                              <Avatar 
                                src={user?.avatar} 
                                size="small"
                                style={{ marginRight: '8px' }} 
                              />
                            )}
                          </div>
                          
                          <Text
                            type="secondary"
                            style={{
                              fontSize: '11px',
                              marginLeft: isOwn ? '0' : '8px',
                              marginRight: isOwn ? '8px' : '0',
                              marginTop: '4px',
                              display: 'block',
                              textAlign: isOwn ? 'right' : 'left',
                            }}
                          >
                            {dayjs(msg.createdAt).format('HH:mm')}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* 滚动到底部锚点 */}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <Empty
              description="还没有消息，发送第一条消息开始聊天吧！"
              style={{ margin: 'auto' }}
            />
          )}
        </div>
        
        {/* 附件预览 */}
        {fileAttachments.length > 0 && (
          <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-background)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {fileAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--hover-color)',
                    borderRadius: '6px',
                    padding: '8px',
                    maxWidth: '300px'
                  }}
                >
                  {attachment.type.startsWith('image/') ? (
                    <PictureOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                  ) : (
                    <FileOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text ellipsis style={{ fontSize: '12px' }}>
                      {attachment.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {roomMessageService.formatFileSize(attachment.size)}
                    </Text>
                    {attachment.status === 'uploading' && (
                      <Progress percent={attachment.progress} size="small" />
                    )}
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeAttachment(attachment.id)}
                    style={{ color: '#ff4d4f' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 消息输入区域 */}
        <Divider style={{ margin: 0, borderColor: 'var(--border-color)' }} />
        <div style={{ padding: '16px 24px', background: 'var(--card-background)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button 
                type="text" 
                icon={<PictureOutlined />}
                onClick={() => triggerFileInput('image')}
                disabled={!isMember || sending}
                title={isMember ? '发送图片' : '非群成员无法发送附件'}
              />
              <Button 
                type="text" 
                icon={<PaperClipOutlined />}
                onClick={() => triggerFileInput('file')}
                disabled={!isMember || sending}
                title={isMember ? '发送文件' : '非群成员无法发送附件'}
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
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isMember ? "输入消息..." : "您不是群成员，无法发送消息"}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1 }}
              disabled={!isMember || sending}
              onPressEnter={(e) => {
                if (!e.shiftKey && isMember && !sending) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && fileAttachments.length === 0) || !isMember || sending}
              loading={sending}
              style={{ height: '40px' }}
            >
              发送
            </Button>
          </div>
        </div>
        
        {/* 浮动滚动到底部按钮 */}
        {showScrollToBottom && (
          <FloatButton
            icon={<DownOutlined />}
            onClick={scrollToBottom}
            type="primary"
            style={{
              right: 24,
              bottom: 100
            }}
          />
        )}
        
        {/* 浮动刷新按钮 */}
        <FloatButton
          icon={<ReloadOutlined />}
          onClick={() => loadMessages()}
          type="default"
          style={{
            right: 24,
            bottom: 160
          }}
          tooltip="刷新消息"
        />
      </div>
    </>
  );
}