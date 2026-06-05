import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { Toast as ToastType } from '@/types';

interface ToastProps {
  toasts: ToastType[];
  onRemove: (id: number) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  const getIcon = (type: ToastType['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'info':
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = (type: ToastType['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          icon={getIcon(toast.type)}
          bgColor={getBgColor(toast.type)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: number) => void;
  icon: React.ReactNode;
  bgColor: string;
}

function ToastItem({ toast, onRemove, icon, bgColor }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
                  animate-in slide-in-from-right duration-300 ${bgColor}`}
    >
      {icon}
      <span className="text-sm font-medium text-gray-800">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="关闭"
      >
        <X size={16} />
      </button>
    </div>
  );
}
