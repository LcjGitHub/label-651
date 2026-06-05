import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from '@/pages/Home';
import Roles from '@/pages/Roles';
import OperationLogs from '@/pages/OperationLogs';
import Login from '@/pages/Login';
import { useAuthStore } from '@/store/authStore';
import { getCurrentUserId } from '@/services/api';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const userId = getCurrentUserId();

  useEffect(() => {
    const verify = async () => {
      if (userId) {
        await checkAuth();
      }
      setChecking(false);
    };
    verify();
  }, [userId, checkAuth]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <Roles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operation-logs"
          element={
            <ProtectedRoute>
              <OperationLogs />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
