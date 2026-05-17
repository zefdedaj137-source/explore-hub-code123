import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSkeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admin check — allow by email or by user ID
  if (adminOnly) {
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);
    const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS || "")
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
    const userEmail = (user.email || user.user_metadata?.email || "").toLowerCase().trim();
    const isAdmin = (userEmail && adminEmails.includes(userEmail)) || adminIds.includes(user.id);
    if (!isAdmin) {
      return <Navigate to="/discover" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
