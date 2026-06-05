import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, Loader2, Trash2, Eye } from 'lucide-react';
import { Message, MessageType, Toast as ToastType } from '@/types';
import { useMessageStore } from '@/store/messageStore';
import { useNavigate } from 'react-router-dom';
import MessageDetailModal from './MessageDetailModal';

interface MessageDropdownProps {
  showToast: (type: ToastType['type'], message: string) => void;
}

const typeMap: Record<MessageType, { label: string; color: string; bg: string; dot: string }> = {
  system: { label: '系统', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  task: { label: '任务', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  other: { label: '其他', color: 'text-gray-700', bg: 'bg-gray-50', dot: 'bg-gray-500' },
};

export default function MessageDropdown({ showToast }: MessageDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const unreadCount = useMessageStore((state) => state.unreadCount);
  const fetchMessages = useMessageStore((state) => state.fetchMessages);
  const markAsRead = useMessageStore((state) => state.markAsRead);
  const markAllAsRead = useMessageStore((state) => state.markAllAsRead);
  const deleteMessage = useMessageStore((state) => state.deleteMessage);
  const setUnreadCount = useMessageStore((state) => state.setUnreadCount);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const result = await fetchMessages({ page_size: 10 });
      setMessages(result.messages);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载消息失败';
      showToast('error', message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    } else {
      setHasLoaded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleViewDetail = async (message: Message) => {
    setIsOpen(false);
    setSelectedMessage(message);
    setDetailModalOpen(true);
    if (message.is_read === 0) {
      try {
        await markAsRead(message.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, is_read: 1 } : m))
        );
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    if (message.is_read === 1) return;
    try {
      setActionLoading(message.id);
      await markAsRead(message.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_read: 1 } : m))
      );
      showToast('success', '已标记为已读');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      showToast('error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(-1);
      const response = await markAllAsRead();
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: 1 })));
      setUnreadCount(0);
      showToast('success', '全部已标记为已读');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      showToast('error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    try {
      setActionLoading(message.id);
      await deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      showToast('success', '删除成功');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      showToast('error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const goToMessageCenter = () => {
    setIsOpen(false);
    navigate('/messages');
  };

  const displayUnread = unreadCount > 99 ? '99+' : unreadCount;
  const isMarkAllLoading = actionLoading === -1;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"
          title="消息通知"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
              {displayUnread}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-slate-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Bell size={16} className="text-blue-600" />
                消息通知
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-normal">
                    {unreadCount}条未读
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkAllLoading}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
                >
                  {isMarkAllLoading ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  全部已读
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading || !hasLoaded ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                  <p className="mt-3 text-sm text-gray-500">加载消息中...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Bell className="text-gray-400" size={28} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">暂无消息</p>
                  <p className="text-xs text-gray-400 mt-1">系统消息将在这里显示</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {messages.map((message) => {
                    const typeInfo = typeMap[message.type] || typeMap.other;
                    const isLoadingAction = actionLoading === message.id;
                    return (
                      <div
                        key={message.id}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group ${
                          message.is_read === 0 ? 'bg-blue-50/40' : ''
                        }`}
                        onClick={() => handleViewDetail(message)}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {message.is_read === 0 && (
                              <span className={`inline-block w-2 h-2 rounded-full ${typeInfo.dot}`} />
                            )}
                            {message.is_read === 1 && (
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(message.created_at)}</span>
                            </div>
                            <p className={`text-sm font-medium truncate ${
                              message.is_read === 0 ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              {message.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {message.content}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              来自：{message.sender_name || '系统'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {message.is_read === 0 && (
                              <button
                                onClick={(e) => handleMarkAsRead(e, message)}
                                disabled={isLoadingAction}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="标记已读"
                              >
                                {isLoadingAction ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, message)}
                              disabled={isLoadingAction}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="删除"
                            >
                              {isLoadingAction ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={goToMessageCenter}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 hover:bg-blue-50 rounded-lg transition-colors"
              >
                查看全部消息
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <MessageDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        message={selectedMessage}
      />
    </>
  );
}
