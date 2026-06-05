import { useEffect, useState } from 'react';
import { X, Bell, Clock, User } from 'lucide-react';
import { Message, MessageType } from '@/types';

interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

const typeMap: Record<MessageType, { label: string; color: string; bg: string }> = {
  system: { label: '系统通知', color: 'text-blue-700', bg: 'bg-blue-100' },
  task: { label: '任务提醒', color: 'text-orange-700', bg: 'bg-orange-100' },
  other: { label: '其他消息', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export default function MessageDetailModal({ isOpen, onClose, message }: MessageDetailModalProps) {
  const [displayMessage, setDisplayMessage] = useState<Message | null>(message);

  useEffect(() => {
    setDisplayMessage(message);
  }, [message]);

  if (!isOpen || !displayMessage) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const typeInfo = typeMap[displayMessage.type] || typeMap.other;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-[110] bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Bell className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {displayMessage.title}
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${typeInfo.bg} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>发送人：{displayMessage.sender_name || '系统'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{formatDate(displayMessage.created_at)}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {displayMessage.content}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
