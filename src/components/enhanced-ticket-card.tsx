import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Calendar,
  ArrowUpRight,
  Building2,
  CheckCircle,
  AlertCircle,
  Timer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface EnhancedTicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    createdAt?: string;
    customerName?: string;
    category?: { name: string; code: string; color?: string } | null;
    subcategory?: { name: string; code: string } | null;
    studio?: { name: string; code: string } | null;
    assignedToUser?: { id: string; displayName?: string; email?: string } | null;
    assignedDepartment?: { id: string; name: string; code: string } | null;
    slaBreached?: boolean;
    slaDueAt?: string;
  };
  compact?: boolean;
  showAssignee?: boolean;
}

const priorityConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  critical: { color: "text-red-600", bgColor: "bg-red-500/10 border-red-500/20", label: "Critical" },
  high: { color: "text-orange-600", bgColor: "bg-orange-500/10 border-orange-500/20", label: "High" },
  medium: { color: "text-amber-600", bgColor: "bg-amber-500/10 border-amber-500/20", label: "Medium" },
  low: { color: "text-emerald-600", bgColor: "bg-emerald-500/10 border-emerald-500/20", label: "Low" },
};

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  new: { color: "text-blue-600", bgColor: "bg-blue-500/10", label: "New" },
  assigned: { color: "text-purple-600", bgColor: "bg-purple-500/10", label: "Assigned" },
  in_progress: { color: "text-amber-600", bgColor: "bg-amber-500/10", label: "In Progress" },
  pending_customer: { color: "text-orange-600", bgColor: "bg-orange-500/10", label: "Pending" },
  resolved: { color: "text-emerald-600", bgColor: "bg-emerald-500/10", label: "Resolved" },
  closed: { color: "text-gray-600", bgColor: "bg-gray-500/10", label: "Closed" },
  reopened: { color: "text-red-600", bgColor: "bg-red-500/10", label: "Reopened" },
};

export function EnhancedTicketCard({ ticket, compact = false, showAssignee = true }: EnhancedTicketCardProps) {
  const priority = priorityConfig[ticket.priority || 'medium'] || priorityConfig.medium;
  const status = statusConfig[ticket.status || 'new'] || statusConfig.new;
  
  const timeAgo = ticket.createdAt 
    ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
    : 'Unknown';

  const assigneeName = ticket.assignedToUser?.displayName || ticket.assignedToUser?.email || null;
  const assigneeInitials = assigneeName 
    ? assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : '??';

  return (
    <Link href={`/tickets/${ticket.id}`}>
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.15 }}
      >
        <Card className={cn(
          "glass-card cursor-pointer transition-all duration-300",
          "hover:shadow-lg hover:border-primary/20",
          "group relative overflow-hidden",
          ticket.slaBreached && "ring-2 ring-destructive/30"
        )}>
          {/* Priority indicator bar */}
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
            ticket.priority === 'critical' && "bg-red-500",
            ticket.priority === 'high' && "bg-orange-500",
            ticket.priority === 'medium' && "bg-amber-500",
            ticket.priority === 'low' && "bg-emerald-500",
          )} />

          <CardContent className={cn("p-4", compact ? "py-3" : "py-4")}>
            <div className="flex items-start gap-3">
              {/* Main Content */}
              <div className="flex-1 min-w-0 pl-2">
                {/* Header Row */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-muted-foreground">
                    {ticket.ticketNumber}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px] h-5", status.bgColor, status.color)}>
                    {status.label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] h-5", priority.bgColor, priority.color)}>
                    {priority.label}
                  </Badge>
                  {ticket.slaBreached && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="destructive" className="text-[10px] h-5 animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          SLA Breached
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>This ticket has exceeded its SLA deadline</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Title */}
                <h3 className={cn(
                  "font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1",
                  compact ? "text-sm" : "text-base"
                )}>
                  {ticket.title}
                </h3>

                {/* Description (non-compact only) */}
                {!compact && ticket.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {ticket.description}
                  </p>
                )}

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {ticket.category && (
                    <span className="flex items-center gap-1">
                      <span 
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ticket.category.color || 'hsl(var(--primary))' }}
                      />
                      {ticket.category.name}
                    </span>
                  )}
                  
                  {ticket.studio && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ticket.studio.name}
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo}
                  </span>

                  {ticket.customerName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.customerName}
                    </span>
                  )}
                </div>

                {/* Assignee & Department Row */}
                {showAssignee && (ticket.assignedToUser || ticket.assignedDepartment) && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                    {ticket.assignedToUser && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {assigneeInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{assigneeName || 'Unassigned'}</p>
                          <p className="text-[10px] text-muted-foreground">Assignee</p>
                        </div>
                      </div>
                    )}
                    
                    {ticket.assignedDepartment && (
                      <div className="flex items-center gap-2 border-l border-border/50 pl-3">
                        <div className="h-6 w-6 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{ticket.assignedDepartment.name}</p>
                          <p className="text-[10px] text-muted-foreground">Department</p>
                        </div>
                      </div>
                    )}

                    {ticket.slaDueAt && !ticket.slaBreached && (
                      <div className="flex items-center gap-2 border-l border-border/50 pl-3 ml-auto">
                        <Timer className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-xs font-medium">
                            {formatDistanceToNow(new Date(ticket.slaDueAt))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">SLA remaining</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow Icon */}
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
