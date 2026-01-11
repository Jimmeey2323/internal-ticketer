import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "staff" | "viewer";

export interface UserRoleInfo {
  role: AppRole | null;
  roles: AppRole[];
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isViewer: boolean;
  isAdminOrManager: boolean;
  canManageTickets: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageReports: boolean;
  canViewAnalytics: boolean;
  canEscalate: boolean;
  canDeleteTickets: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  staff: 2,
  viewer: 1,
};

export function useUserRole(): UserRoleInfo {
  const { user, isLoading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!user?.id) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (fetchError) {
        console.error("Error fetching user roles:", fetchError);
        setError(fetchError.message);
        setRoles([]);
      } else {
        const userRoles = (data || []).map((r) => r.role as AppRole);
        setRoles(userRoles);
      }
    } catch (err) {
      console.error("Error in useUserRole:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      fetchRoles();
    }
  }, [authLoading, fetchRoles]);

  // Get the highest role (primary role)
  const primaryRole = useMemo(() => {
    if (roles.length === 0) return null;
    return roles.reduce((highest, current) => {
      if (!highest) return current;
      return ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest;
    }, null as AppRole | null);
  }, [roles]);

  // Role checks
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");
  const isStaff = roles.includes("staff");
  const isViewer = roles.includes("viewer");
  const isAdminOrManager = isAdmin || isManager;

  // Permission checks based on role hierarchy
  const permissions = useMemo(() => ({
    canManageTickets: isAdmin || isManager || isStaff,
    canManageUsers: isAdmin,
    canManageSettings: isAdmin || isManager,
    canManageReports: isAdmin || isManager,
    canViewAnalytics: isAdmin || isManager || isStaff,
    canEscalate: isAdmin || isManager,
    canDeleteTickets: isAdmin || isManager,
  }), [isAdmin, isManager, isStaff]);

  return {
    role: primaryRole,
    roles,
    isAdmin,
    isManager,
    isStaff,
    isViewer,
    isAdminOrManager,
    ...permissions,
    isLoading: authLoading || isLoading,
    error,
    refetch: fetchRoles,
  };
}

// Higher-order component for role-based access
export function withRoleAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles: AppRole[],
  FallbackComponent?: React.ComponentType
) {
  return function RoleProtectedComponent(props: P) {
    const { roles, isLoading } = useUserRole();
    
    if (isLoading) {
      return null; // Or a loading spinner
    }

    const hasAccess = requiredRoles.some((role) => roles.includes(role));
    
    if (!hasAccess) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

// Hook to check if user has specific permission
export function useHasPermission(requiredRoles: AppRole[]): boolean {
  const { roles, isLoading } = useUserRole();
  
  if (isLoading) return false;
  
  return requiredRoles.some((role) => roles.includes(role));
}
