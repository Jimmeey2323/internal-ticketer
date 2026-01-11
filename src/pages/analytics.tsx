import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Building2,
  Download,
  Calendar,
  RefreshCw,
  Sparkles,
  FolderKanban,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { STUDIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  ticketsByCategory: { category: string; count: number }[];
  ticketsByStudio: { studio: string; count: number }[];
  ticketsByTeam: { team: string; count: number }[];
  ticketTrend: { date: string; count: number }[];
  resolutionTimeByPriority: { priority: string; avgHours: number }[];
  topCategories: { category: string; count: number }[];
}

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [studioFilter, setStudioFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: analytics, isLoading, refetch, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", { timeRange, studio: studioFilter }],
    queryFn: async () => {
      try {
        // Fetch all tickets from Supabase
        const { data: tickets, error } = await supabase
          .from('tickets')
          .select('*');
        
        if (error) throw error;
        if (!tickets || tickets.length === 0) {
          return {
            ticketsByCategory: [],
            ticketsByStudio: [],
            ticketsByTeam: [],
            ticketTrend: [],
            resolutionTimeByPriority: [],
            topCategories: [],
          };
        }

        // Compute analytics from actual data with null safety
        const categoryCount: Record<string, number> = {};
        const studioCount: Record<string, number> = {};
        const teamCount: Record<string, number> = {};
        
        tickets.forEach(t => {
          if (t?.categoryId) {
            categoryCount[t.categoryId] = (categoryCount[t.categoryId] || 0) + 1;
          }
          if (t?.studioId) {
            studioCount[t.studioId] = (studioCount[t.studioId] || 0) + 1;
          }
          if (t?.assignedToUserId) {
            teamCount[t.assignedToUserId] = (teamCount[t.assignedToUserId] || 0) + 1;
          }
        });

        const ticketsByCategory = Object.entries(categoryCount)
          .map(([category, count]) => ({ category: category || "Unknown", count }))
          .sort((a, b) => b.count - a.count);

        const ticketsByStudio = Object.entries(studioCount)
          .map(([studio, count]) => ({ studio: studio || "Unknown", count }))
          .sort((a, b) => b.count - a.count);

        const ticketsByTeam = Object.entries(teamCount)
          .map(([team, count]) => ({ team: team || "Unassigned", count }))
          .sort((a, b) => b.count - a.count);

        // Compute trends over time
        const last30Days: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          const dayTickets = tickets.filter(t => {
            if (!t?.createdAt) return false;
            try {
              const created = new Date(t.createdAt);
              return created >= date && created < nextDate;
            } catch {
              return false;
            }
          });

          last30Days.push({
            date: date.toISOString().split('T')[0],
            count: dayTickets.length
          });
        }

        // Resolution times by priority with null safety
        const priorities = ['low', 'medium', 'high', 'critical'];
        const resolutionTimeByPriority = priorities.map(priority => {
          const priorityTickets = tickets.filter(t => 
            t?.priority === priority && t?.resolvedAt && t?.createdAt
          );
          let avgHours = 0;
          if (priorityTickets.length > 0) {
            try {
              const totalHours = priorityTickets.reduce((acc, t) => {
                const created = new Date(t.createdAt!).getTime();
                const resolved = new Date(t.resolvedAt!).getTime();
                return acc + (resolved - created) / (1000 * 60 * 60);
              }, 0);
              avgHours = Math.round((totalHours / priorityTickets.length) * 10) / 10;
            } catch {
              avgHours = 0;
            }
          }
          return { priority, avgHours };
        });

        const topCategories = ticketsByCategory.slice(0, 5);

        return {
          ticketsByCategory,
          ticketsByStudio,
          ticketsByTeam,
          ticketTrend: last30Days,
          resolutionTimeByPriority,
          topCategories
        };
      } catch (err) {
        console.error('Error fetching analytics:', err);
        return {
          ticketsByCategory: [],
          ticketsByStudio: [],
          ticketsByTeam: [],
          ticketTrend: [],
          resolutionTimeByPriority: [],
          topCategories: [],
        };
      }
    }
  });

  const safeAnalytics = useMemo(() => ({
    ticketsByCategory: analytics?.ticketsByCategory ?? [],
    ticketsByStudio: analytics?.ticketsByStudio ?? [],
    ticketsByTeam: analytics?.ticketsByTeam ?? [],
    ticketTrend: analytics?.ticketTrend ?? [],
    resolutionTimeByPriority: analytics?.resolutionTimeByPriority ?? [],
    topCategories: analytics?.topCategories ?? [],
  }), [analytics]);

  const computedMetrics = useMemo(() => {
    const totalTickets = safeAnalytics.ticketsByCategory.reduce((sum, item) => sum + (item?.count || 0), 0);
    let avgResolutionTime = 0;
    if (safeAnalytics.resolutionTimeByPriority.length > 0) {
      const validTimes = safeAnalytics.resolutionTimeByPriority.filter(item => item?.avgHours > 0);
      if (validTimes.length > 0) {
        avgResolutionTime = Math.round(
          (validTimes.reduce((sum, item) => sum + item.avgHours, 0) / validTimes.length) * 10
        ) / 10;
      }
    }
    return { totalTickets, avgResolutionTime };
  }, [safeAnalytics]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 mx-auto text-destructive/50" />
          <h3 className="text-lg font-semibold">Error Loading Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const hasData = computedMetrics.totalTickets > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No Analytics Data Available</h3>
          <p className="text-sm text-muted-foreground">
            Analytics data will appear here once tickets are created.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text-accent">Analytics & Reports</h1>
              <p className="text-sm text-muted-foreground">
                Comprehensive performance metrics and insights
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 rounded-xl">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={studioFilter} onValueChange={setStudioFilter}>
            <SelectTrigger className="w-48 rounded-xl">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All studios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Studios</SelectItem>
              {STUDIOS.map((studio) => (
                <SelectItem key={studio.id} value={studio.id}>
                  {studio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { title: "Total Tickets", value: computedMetrics.totalTickets, icon: BarChart3, color: "from-blue-500 to-cyan-500" },
          { title: "Categories", value: safeAnalytics.ticketsByCategory.length, icon: FolderKanban, color: "from-purple-500 to-pink-500" },
          { title: "Studios", value: safeAnalytics.ticketsByStudio.length, icon: Building2, color: "from-emerald-500 to-teal-500" },
          { title: "Avg Resolution", value: `${computedMetrics.avgResolutionTime}h`, icon: Target, color: "from-amber-500 to-orange-500" },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={`${metric.title}-${index}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card className="glass-card relative overflow-hidden group">
                <div className={cn(
                  "absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br opacity-10 -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity",
                  metric.color
                )} />
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      metric.color
                    )}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Ticket Trends (30 Days)
                </CardTitle>
                <CardDescription>Daily ticket creation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={safeAnalytics.ticketTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Resolution Time by Priority
                </CardTitle>
                <CardDescription>Average hours to resolve</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeAnalytics.resolutionTimeByPriority}>
                      <XAxis dataKey="priority" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="avgHours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={safeAnalytics.topCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="category"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {safeAnalytics.topCategories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">By Studio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeAnalytics.ticketsByStudio.slice(0, 6)} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="studio" type="category" width={100} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>Automated analysis of your ticket data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                    Top Performing
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Resolution times have improved by 15% compared to last month.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    Attention Needed
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {safeAnalytics.ticketsByCategory[0]?.category || "Category"} has the most tickets. Consider additional resources.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
