import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserPlus, Search, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  role: string | null;
  isActive: boolean | null;
}

interface AssignAssociateModalProps {
  ticketId: string;
  currentAssigneeId: string | null;
  onAssigned?: () => void;
}

export function AssignAssociateModal({
  ticketId,
  currentAssigneeId,
  onAssigned,
}: AssignAssociateModalProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch available users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["users-for-assignment"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, firstName, lastName, displayName, email, role, isActive")
        .eq("isActive", true)
        .order("displayName");

      if (error) throw error;
      return data || [];
    },
  });

  // Assign user mutation
  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          assignedToUserId: userId,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Associate assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setOpen(false);
      onAssigned?.();
    },
    onError: () => {
      toast({ title: "Failed to assign associate", variant: "destructive" });
    },
  });

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const displayName = (user.displayName || "").toLowerCase();
    const email = (user.email || "").toLowerCase();

    return (
      fullName.includes(searchLower) ||
      displayName.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.displayName) {
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  const getDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email || "Unknown User";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-assign-associate">
          <UserPlus className="h-4 w-4 mr-2" />
          Assign Associate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Associate
          </DialogTitle>
          <DialogDescription>
            Select a team member to assign this ticket to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-associate"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const isCurrentAssignee = user.id === currentAssigneeId;

                  return (
                    <button
                      key={user.id}
                      onClick={() => !isCurrentAssignee && assignMutation.mutate(user.id)}
                      disabled={assignMutation.isPending || isCurrentAssignee}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        isCurrentAssignee
                          ? "bg-primary/10 border-primary/30 cursor-default"
                          : "hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                      } ${assignMutation.isPending ? "opacity-50" : ""}`}
                      data-testid={`user-option-${user.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {getDisplayName(user)}
                          </p>
                          {isCurrentAssignee && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              <Check className="h-3 w-3 mr-1" />
                              Assigned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                        {user.role && (
                          <Badge variant="outline" className="text-xs mt-1 capitalize">
                            {user.role}
                          </Badge>
                        )}
                      </div>
                      {assignMutation.isPending && assignMutation.variables === user.id && (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
