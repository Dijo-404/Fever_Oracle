import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

const RoleRoute = ({ children, allowedRoles, fallbackPath = "/login" }: RoleRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const roleRoutes: Record<string, string> = {
      patient: "/patient/dashboard",
      doctor: "/doctor/dashboard",
      pharma: "/pharma/dashboard",
      admin: "/admin/dashboard"
    };
    const route = roleRoutes[user?.role || 'patient'] || "/dashboard";
    return <Navigate to={route} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;

