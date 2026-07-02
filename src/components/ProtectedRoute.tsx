import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSkeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

// Parsed once at module load — env vars are static at build time.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_IDS = (import.meta.env.VITE_ADMIN_USER_IDS || "")
  .split(",")
  .map((e: string) => e.trim())
  .filter(Boolean);

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
    const userEmail = (user.email || user.user_metadata?.email || "").toLowerCase().trim();
    const isAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || ADMIN_IDS.includes(user.id);
    if (!isAdmin) {
      return <Navigate to="/discover" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
