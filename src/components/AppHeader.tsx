import { Users, Shield, FileText, Bell, UserCog, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { useEffect } from 'react';
import MessageDropdown from './MessageDropdown';
import { Toast } from '@/types';

interface AppHeaderProps {
  showToast: (type: Toast['type'], message: string) => void;
}

export default function AppHeader({ showToast }: AppHeaderProps) {
  const { user, hasPermission, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const connectWebSocket = useMessageStore((state) => state.connectWebSocket);
  const disconnectWebSocket = useMessageStore((state) => state.disconnectWebSocket);
  const fetchUnreadCount = useMessageStore((state) => state.fetchUnreadCount);

  const canViewUserList = hasPermission('user:list');
  const canViewRoleList = hasPermission('role:list');
  const canViewOperationLogs = hasPermission('system:log');

  useEffect(() => {
    connectWebSocket();
    fetchUnreadCount();
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket, fetchUnreadCount]);

  const handleLogout = () => {
    disconnectWebSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
            <UserCog className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理系统</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              管理用户、角色、权限和消息通知
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MessageDropdown showToast={showToast} />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
            title="退出登录"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-xl shadow-lg w-fit">
        {canViewUserList && (
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
        )}
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
  );
}
