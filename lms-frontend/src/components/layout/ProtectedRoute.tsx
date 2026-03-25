import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: string[];
    skipEmailCheck?: boolean;
}

export function ProtectedRoute({ children, roles, skipEmailCheck }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bs-off-white)' }}>
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bs-teal)', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && user && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    if (!skipEmailCheck && user && user.role !== 'ADMIN' && user.email_verified === false) {
        return <Navigate to={`/check-email?email=${encodeURIComponent(user.email)}`} replace />;
    }

    return <>{children}</>;
}
