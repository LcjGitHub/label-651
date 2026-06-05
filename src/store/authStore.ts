import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginResponse } from '@/types';
import { authApi, setCurrentUserId } from '@/services/api';

interface AuthState {
  user: User | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  login: (userId: number) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      loading: false,

      login: async (userId: number) => {
        try {
          set({ loading: true });
          const response = await authApi.login(userId);
          if (response.success && response.data) {
            const { user, roles, permissions } = response.data;
            setCurrentUserId(user.id);
            set({
              user,
              roles,
              permissions,
              isAuthenticated: true,
            });
            return { success: true };
          }
          return { success: false, message: response.message || '登录失败' };
        } catch (err) {
          const message = err instanceof Error ? err.message : '登录失败';
          return { success: false, message };
        } finally {
          set({ loading: false });
        }
      },

      logout: () => {
        setCurrentUserId(null);
        set({
          user: null,
          roles: [],
          permissions: [],
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        try {
          const response = await authApi.getCurrentUser();
          if (response.success && response.data) {
            const { user, roles, permissions } = response.data;
            set({
              user,
              roles,
              permissions,
              isAuthenticated: true,
            });
            return true;
          }
          set({ isAuthenticated: false });
          return false;
        } catch {
          set({ isAuthenticated: false });
          return false;
        }
      },

      hasPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      hasAnyPermission: (permissions: string[]) => {
        const { permissions: userPerms } = get();
        return permissions.some((p) => userPerms.includes(p));
      },

      hasAllPermissions: (permissions: string[]) => {
        const { permissions: userPerms } = get();
        return permissions.every((p) => userPerms.includes(p));
      },

      hasRole: (role: string) => {
        const { roles } = get();
        return roles.includes(role);
      },

      hasAnyRole: (roles: string[]) => {
        const { roles: userRoles } = get();
        return roles.some((r) => userRoles.includes(r));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        roles: state.roles,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
