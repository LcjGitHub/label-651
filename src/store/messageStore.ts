import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, WSNewMessageEvent } from '@/types';
import { messageApi } from '@/services/api';
import { getCurrentUserId } from '@/services/api';

interface MessageState {
  messages: Message[];
  unreadCount: number;
  wsConnected: boolean;
  wsInstance: WebSocket | null;
  fetching: boolean;

  fetchUnreadCount: () => Promise<void>;
  fetchMessages: (params?: {
    type?: 'system' | 'task' | 'other';
    is_read?: 0 | 1;
    page?: number;
    page_size?: number;
  }) => Promise<{ messages: Message[]; total: number }>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
  addMessage: (message: Message) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  setUnreadCount: (count: number) => void;
}

let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
const WS_RECONNECT_DELAY = 3000;

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      messages: [],
      unreadCount: 0,
      wsConnected: false,
      wsInstance: null,
      fetching: false,

      fetchUnreadCount: async () => {
        try {
          const response = await messageApi.getUnreadCount();
          if (response.success && response.data) {
            set({ unreadCount: response.data.unread_count });
          }
        } catch {
          // ignore
        }
      },

      fetchMessages: async (params) => {
        try {
          set({ fetching: true });
          const response = await messageApi.getMessages(params);
          if (response.success && response.data) {
            if (response.unread_count !== undefined) {
              set({ unreadCount: response.unread_count });
            }
            return {
              messages: response.data,
              total: response.total || response.data.length,
            };
          }
          return { messages: [], total: 0 };
        } finally {
          set({ fetching: false });
        }
      },

      markAsRead: async (id: number) => {
        try {
          const response = await messageApi.markAsRead(id);
          if (response.success) {
            if (response.unread_count !== undefined) {
              set({ unreadCount: response.unread_count });
            }
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === id ? { ...m, is_read: 1 } : m
              ),
            }));
          }
        } catch {
          // ignore
        }
      },

      markAllAsRead: async () => {
        try {
          const response = await messageApi.markAllAsRead();
          if (response.success) {
            set({ unreadCount: 0 });
            set((state) => ({
              messages: state.messages.map((m) => ({ ...m, is_read: 1 })),
            }));
          }
        } catch {
          // ignore
        }
      },

      deleteMessage: async (id: number) => {
        try {
          const response = await messageApi.deleteMessage(id);
          if (response.success) {
            if (response.unread_count !== undefined) {
              set({ unreadCount: response.unread_count });
            }
            set((state) => ({
              messages: state.messages.filter((m) => m.id !== id),
            }));
          }
        } catch {
          // ignore
        }
      },

      addMessage: (message: Message) => {
        set((state) => ({
          messages: [message, ...state.messages],
          unreadCount: state.unreadCount + 1,
        }));
      },

      setUnreadCount: (count: number) => {
        set({ unreadCount: count });
      },

      connectWebSocket: () => {
        const userId = getCurrentUserId();
        if (!userId) {
          return;
        }

        const { wsInstance: existingWs } = get();
        if (existingWs && (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING)) {
          return;
        }

        if (wsReconnectTimer) {
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws?userId=${userId}`;

        try {
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log('[WS] WebSocket 连接已建立');
            set({ wsConnected: true, wsInstance: ws });
            get().fetchUnreadCount();
          };

          ws.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data) as WSNewMessageEvent;
              if (parsed.type === 'new_message') {
                const newMessage = parsed.data as Message;
                get().addMessage(newMessage);
              } else if (parsed.type === 'unread_count_update') {
                const data = parsed.data as { unreadCount: number };
                set({ unreadCount: data.unreadCount });
              } else if (parsed.type === 'connected') {
                console.log('[WS] 服务器确认连接:', parsed.data);
              }
            } catch (err) {
              console.error('[WS] 解析消息失败:', err);
            }
          };

          ws.onerror = (err) => {
            console.error('[WS] WebSocket 错误:', err);
            set({ wsConnected: false });
          };

          ws.onclose = (event) => {
            console.log(`[WS] WebSocket 连接已关闭 (code: ${event.code})`);
            set({ wsConnected: false, wsInstance: null });

            wsReconnectTimer = setTimeout(() => {
              console.log('[WS] 尝试重新连接...');
              get().connectWebSocket();
            }, WS_RECONNECT_DELAY);
          };
        } catch (err) {
          console.error('[WS] 创建 WebSocket 失败:', err);
          set({ wsConnected: false });
        }
      },

      disconnectWebSocket: () => {
        const { wsInstance } = get();
        if (wsReconnectTimer) {
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = null;
        }
        if (wsInstance) {
          wsInstance.close();
          set({ wsInstance: null, wsConnected: false });
        }
      },
    }),
    {
      name: 'message-storage',
      partialize: (state) => ({
        unreadCount: state.unreadCount,
      }),
    }
  )
);
