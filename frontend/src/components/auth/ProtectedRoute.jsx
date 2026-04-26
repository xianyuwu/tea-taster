import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user, loading } = useAuthStore();

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>加载中...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
