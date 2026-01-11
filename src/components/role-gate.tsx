import { ReactNode } from "react";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  className?: string;
}

export function RoleGate({ 
  children, 
  allowedRoles, 
  fallback,
  showAccessDenied = true,
  className 
}: RoleGateProps) {
  const { roles, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccess = allowedRoles.some((role) => roles.includes(role));

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <Card className={cn("glass-card", className)}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have permission to view this content. 
              Required role: {allowedRoles.join(" or ")}.
            </p>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function AdminOnly({ children, fallback, className }: Omit<RoleGateProps, "allowedRoles">) {
  return (
    <RoleGate allowedRoles={["admin"]} fallback={fallback} className={className}>
      {children}
    </RoleGate>
  );
}

export function ManagerOnly({ children, fallback, className }: Omit<RoleGateProps, "allowedRoles">) {
  return (
    <RoleGate allowedRoles={["admin", "manager"]} fallback={fallback} className={className}>
      {children}
    </RoleGate>
  );
}

export function StaffOrHigher({ children, fallback, className }: Omit<RoleGateProps, "allowedRoles">) {
  return (
    <RoleGate allowedRoles={["admin", "manager", "staff"]} fallback={fallback} className={className}>
      {children}
    </RoleGate>
  );
}

// Hook for conditional rendering based on role
export function useRoleBasedContent<T>(
  contentByRole: Partial<Record<AppRole | "default", T>>
): T | undefined {
  const { roles, isLoading } = useUserRole();

  if (isLoading) return contentByRole.default;

  // Check roles in order of precedence
  const roleOrder: AppRole[] = ["admin", "manager", "staff", "viewer"];
  
  for (const role of roleOrder) {
    if (roles.includes(role) && contentByRole[role] !== undefined) {
      return contentByRole[role];
    }
  }

  return contentByRole.default;
}

// Component to show different content based on role
interface RoleBasedContentProps {
  admin?: ReactNode;
  manager?: ReactNode;
  staff?: ReactNode;
  viewer?: ReactNode;
  default?: ReactNode;
  loading?: ReactNode;
}

export function RoleBasedContent({
  admin,
  manager,
  staff,
  viewer,
  default: defaultContent,
  loading,
}: RoleBasedContentProps) {
  const { roles, isLoading } = useUserRole();

  if (isLoading) {
    return loading ? <>{loading}</> : (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (roles.includes("admin") && admin !== undefined) return <>{admin}</>;
  if (roles.includes("manager") && manager !== undefined) return <>{manager}</>;
  if (roles.includes("staff") && staff !== undefined) return <>{staff}</>;
  if (roles.includes("viewer") && viewer !== undefined) return <>{viewer}</>;
  
  return defaultContent ? <>{defaultContent}</> : null;
}

// Badge showing current user's role
export function RoleBadge({ className }: { className?: string }) {
  const { role, isLoading } = useUserRole();

  if (isLoading || !role) return null;

  const roleConfig: Record<AppRole, { label: string; color: string }> = {
    admin: { label: "Admin", color: "bg-red-500/10 text-red-600 border-red-500/30" },
    manager: { label: "Manager", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
    staff: { label: "Staff", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    viewer: { label: "Viewer", color: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
  };

  const config = roleConfig[role];

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      config.color,
      className
    )}>
      <Shield className="h-3 w-3" />
      {config.label}
    </span>
  );
}
