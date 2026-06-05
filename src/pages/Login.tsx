import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Loader2, Shield, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import Toast from '@/components/Toast';
import { Toast as ToastType } from '@/types';

export default function Login() {
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    loadUsers();
  }, [isAuthenticated, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await authApi.getLoginUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogin = async () => {
    if (!selectedUser) {
      showToast('请选择要登录的用户', 'error');
      return;
    }

    try {
      setLoggingIn(true);
      const result = await login(selectedUser);
      if (result.success) {
        showToast('登录成功', 'success');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        showToast(result.message || '登录失败', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '登录失败', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">用户管理系统</h1>
            <p className="text-blue-100">选择身份登录体验权限控制</p>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择登录身份
              </label>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedUser === user.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedUser === user.id ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <User
                        size={20}
                        className={selectedUser === user.id ? 'text-white' : 'text-gray-500'}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div
                        className={`font-medium ${
                          selectedUser === user.id ? 'text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    {selectedUser === user.id && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={!selectedUser || loggingIn}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all duration-200 ${
                !selectedUser || loggingIn
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
              }`}
            >
              {loggingIn ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  登录系统
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          开发模式 · 不同用户拥有不同的操作权限
        </p>
      </div>
    </div>
  );
}
