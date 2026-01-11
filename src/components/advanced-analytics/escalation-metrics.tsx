import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, AlertCircle, ArrowUpRight, Users, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface EscalationData {
  id: string;
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  escalationType: "automatic" | "manual";
  escalatedFrom?: string;
  escalatedTo?: string;
  previousPriority?: string;
  newPriority?: string;
  reason?: string;
  createdAt: string;
}

interface EscalationTrend {
  date: string;
  automatic: number;
  manual: number;
  total: number;
}

interface EscalationByReason {
  reason: string;
  count: number;
}

interface EscalationMetricsProps {
  escalations: EscalationData[];
  trends: EscalationTrend[];
  byReason: EscalationByReason[];
  className?: string;
}

const CHART_COLORS = {
  automatic: "hsl(var(--chart-1))",
  manual: "hsl(var(--chart-3))",
  total: "hsl(var(--primary))",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-emerald-500 text-white",
};

export function EscalationMetrics({ 
  escalations, 
  trends, 
  byReason,
  className 
}: EscalationMetricsProps) {
  const metrics = useMemo(() => {
    const total = escalations.length;
    const automatic = escalations.filter(e => e.escalationType === "automatic").length;
    const manual = escalations.filter(e => e.escalationType === "manual").length;
    
    // Calculate average time between creation and escalation (assuming we have ticket creation data)
    const priorityUpgrades = escalations.filter(e => e.previousPriority && e.newPriority).length;
    
    return {
      total,
      automatic,
      manual,
      automaticRate: total > 0 ? Math.round((automatic / total) * 100) : 0,
      priorityUpgrades,
    };
  }, [escalations]);

  const recentEscalations = useMemo(() => 
    escalations.slice(0, 10)
  , [escalations]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Total Escalations</span>
            </div>
            <p className="text-2xl font-bold">{metrics.total}</p>
            <p className="text-xs text-muted-foreground mt-1">in selected period</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Automatic</span>
            </div>
            <p className="text-2xl font-bold">{metrics.automatic}</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.automaticRate}% of total</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Manual</span>
            </div>
            <p className="text-2xl font-bold">{metrics.manual}</p>
            <p className="text-xs text-muted-foreground mt-1">{100 - metrics.automaticRate}% of total</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Priority Upgrades</span>
            </div>
            <p className="text-2xl font-bold">{metrics.priorityUpgrades}</p>
            <p className="text-xs text-muted-foreground mt-1">priority increased</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Escalation Trends
            </CardTitle>
            <CardDescription>Automatic vs manual escalations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.automatic} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.automatic} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.manual} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.manual} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="automatic" 
                    stroke={CHART_COLORS.automatic} 
                    fillOpacity={1} 
                    fill="url(#colorAuto)"
                    stackId="1"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="manual" 
                    stroke={CHART_COLORS.manual} 
                    fillOpacity={1} 
                    fill="url(#colorManual)"
                    stackId="1"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Escalation Reasons</CardTitle>
            <CardDescription>Most common reasons for escalation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byReason} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="reason" type="category" width={120} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Escalations */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Escalations
          </CardTitle>
          <CardDescription>Latest escalated tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            <div className="space-y-3">
              {recentEscalations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No escalations found</p>
              ) : (
                recentEscalations.map((esc) => (
                  <div 
                    key={esc.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      esc.escalationType === "automatic" 
                        ? "bg-amber-500/20 text-amber-600" 
                        : "bg-primary/20 text-primary"
                    )}>
                      {esc.escalationType === "automatic" ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{esc.ticketNumber}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {esc.escalationType}
                        </Badge>
                        {esc.previousPriority && esc.newPriority && (
                          <div className="flex items-center gap-1 text-xs">
                            <Badge className={cn("text-xs", PRIORITY_COLORS[esc.previousPriority] || "bg-muted")}>
                              {esc.previousPriority}
                            </Badge>
                            <ArrowUpRight className="h-3 w-3" />
                            <Badge className={cn("text-xs", PRIORITY_COLORS[esc.newPriority] || "bg-muted")}>
                              {esc.newPriority}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate mt-1">{esc.ticketTitle}</p>
                      {esc.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{esc.reason}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(esc.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
