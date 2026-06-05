import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Eye, Loader2, Trash2, Users, Shield, FileText, Inbox } from 'lucide-react';
import { Message, MessageType, Toast as ToastType } from '@/types';
import { useMessageStore } from '@/store/messageStore';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import MessageDetailModal from '@/components/MessageDetailModal';

interface FilterTab {
  key: MessageType | 'all';
  label: string;
  icon: React.ReactNode;
}

const typeMap: Record<MessageType, { label: string; color: string; bg: string; dot: string }> = {
  system: { label: '系统通知', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  task: { label: '任务提醒', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  other: { label: '其他消息', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-500' },
};

const filterTabs: FilterTab[] = [
  { key: 'all', label: '全部', icon: <Inbox size={16} /> },
  { key: 'system', label: '系统通知', icon: <Bell size={16} /> },
  { key: 'task', label: '任务提醒', icon: <FileText size={16} /> },
  { key: 'other', label: '其他', icon: <Users size={16} /> },
];

export default function Messages() {
  const { user, logout, hasPermission } = useAuthStore();
  const location = useLocation();
  const canViewRoleList = hasPermission('role:list');
  const canViewOperationLogs = hasPermission('system:log');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<MessageType | 'all'>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const unreadCount = useMessageStore((state) => state.unreadCount);
  const fetchMessages = useMessageStore((state) => state.fetchMessages);
  const markAsRead = useMessageStore((state) => state.markAsRead);
  const markAllAsRead = useMessageStore((state) => state.markAllAsRead);
  const deleteMessage = useMessageStore((state) => state.deleteMessage);

  const showToast = (type: ToastType['type'], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const isReadParam =
        readFilter === 'unread' ? 0 : readFilter === 'read' ? 1 : undefined;
      const typeParam = activeFilter === 'all' ? undefined : activeFilter;

      const result = await fetchMessages({
        type: typeParam,
        is_read: isReadParam,
        page_size: 50,
      });
      setMessages(result.messages);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载消息失败';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, readFilter, fetchMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetail = async (message: Message) => {
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

  const handleMarkAsRead = async (message: Message) => {
    if (message.is_read === 1) return;
    try {
      setActionLoadingId(message.id);
      await markAsRead(message.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_read: 1 } : m))
      );
      showToast('success', '已标记为已读');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      showToast('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: 1 })));
      showToast('success', '全部已标记为已读');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      showToast('error', msg);
    }
  };

  const handleDelete = async (message: Message) => {
    if (!confirm(`确定要删除这条消息吗？`)) return;
    try {
      setActionLoadingId(message.id);
      await deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast('success', '删除成功');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      showToast('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const unreadInCurrent = messages.filter((m) => m.is_read === 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {toasts.map((t) => (
        <div key={t.id} className="fixed top-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
              t.type === 'success'
                ? 'bg-green-500 text-white'
                : t.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
            onClick={() => removeToast(t.id)}
          >
            {t.message}
          </div>
        </div>
      ))}

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <Bell className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">消息中心</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  查看和管理您的所有站内消息
                  {unreadCount > 0 && (
                    <span className="ml-2 text-red-500 font-medium">
                      ({unreadCount} 条未读)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700
                             rounded-lg font-medium text-sm hover:bg-gray-50 hover:border-gray-400
                             transition-all duration-200 shadow-sm"
                >
                  <CheckCheck size={16} />
                  全部已读
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 bg-white p-1 rounded-xl shadow-lg w-fit">
            <Link
              to="/"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                location.pathname === '/'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users size={16} />
              用户管理
            </Link>
            {canViewRoleList && (
              <Link
                to="/roles"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  location.pathname === '/roles'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Shield size={16} />
                角色管理
              </Link>
            )}
            {canViewOperationLogs && (
              <Link
                to="/operation-logs"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  location.pathname === '/operation-logs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText size={16} />
                操作日志
              </Link>
            )}
            <Link
              to="/messages"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                location.pathname === '/messages'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bell size={16} />
              消息中心
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === tab.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['all', 'unread', 'read'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setReadFilter(status)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      readFilter === status
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '全部状态' : status === 'unread' ? '未读' : '已读'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              共 <span className="font-semibold text-gray-900">{total}</span> 条消息
              {unreadInCurrent > 0 && (
                <span className="ml-2 text-red-500">
                  ({unreadInCurrent} 条未读)
                </span>
              )}
            </p>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无消息</h3>
              <p className="text-gray-500 text-sm">
                当前筛选条件下没有找到消息
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.map((message) => {
                const typeInfo = typeMap[message.type] || typeMap.other;
                const isActionLoading = actionLoadingId === message.id;
                return (
                  <div
                    key={message.id}
                    className={`px-6 py-4 hover:bg-blue-50/30 transition-colors cursor-pointer group ${
                      message.is_read === 0 ? 'bg-blue-50/20' : 'bg-white'
                    }`}
                    onClick={() => handleViewDetail(message)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 pt-1">
                        {message.is_read === 0 && (
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${typeInfo.dot}`} />
                        )}
                        {message.is_read === 1 && (
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            <h4 className={`font-medium mb-1 ${
                              message.is_read === 0 ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {message.title}
                            </h4>
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {message.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              发送人：{message.sender_name || '系统'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {message.is_read === 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(message);
                                }}
                                disabled={isActionLoading}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="标记已读"
                              >
                                {isActionLoading ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(message);
                              }}
                              disabled={isActionLoading}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              {isActionLoading ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <MessageDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          message={selectedMessage}
        />
      </div>
    </div>
  );
}
