import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Target, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SLAData {
  category: string;
  categoryName?: string;
  total: number;
  breached: number;
  onTime: number;
  avgResolutionHours: number;
  slaTargetHours: number;
}

interface SLAComplianceChartProps {
  data: SLAData[];
  className?: string;
}

const CHART_COLORS = {
  onTime: "hsl(var(--chart-2))",
  breached: "hsl(var(--destructive))",
  warning: "hsl(var(--chart-4))",
};

export function SLAComplianceChart({ data, className }: SLAComplianceChartProps) {
  const metrics = useMemo(() => {
    const totalTickets = data.reduce((sum, d) => sum + d.total, 0);
    const totalBreached = data.reduce((sum, d) => sum + d.breached, 0);
    const totalOnTime = data.reduce((sum, d) => sum + d.onTime, 0);
    const complianceRate = totalTickets > 0 ? ((totalOnTime / totalTickets) * 100) : 0;
    const avgResolution = data.length > 0 
      ? data.reduce((sum, d) => sum + d.avgResolutionHours, 0) / data.length 
      : 0;

    return {
      totalTickets,
      totalBreached,
      totalOnTime,
      complianceRate: Math.round(complianceRate * 10) / 10,
      avgResolution: Math.round(avgResolution * 10) / 10,
    };
  }, [data]);

  const pieData = useMemo(() => [
    { name: "On Time", value: metrics.totalOnTime, color: CHART_COLORS.onTime },
    { name: "Breached", value: metrics.totalBreached, color: CHART_COLORS.breached },
  ], [metrics]);

  const barData = useMemo(() => 
    data.map(d => ({
      name: d.categoryName || d.category.slice(0, 12),
      compliance: d.total > 0 ? Math.round((d.onTime / d.total) * 100) : 0,
      breachRate: d.total > 0 ? Math.round((d.breached / d.total) * 100) : 0,
    }))
  , [data]);

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  };

  const getComplianceBg = (rate: number) => {
    if (rate >= 90) return "bg-emerald-500";
    if (rate >= 75) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Compliance Rate</span>
            </div>
            <p className={cn("text-2xl font-bold", getComplianceColor(metrics.complianceRate))}>
              {metrics.complianceRate}%
            </p>
            <Progress 
              value={metrics.complianceRate} 
              className="mt-2 h-1.5"
            />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">On Time</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalOnTime}</p>
            <p className="text-xs text-muted-foreground mt-1">tickets resolved on time</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">SLA Breaches</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{metrics.totalBreached}</p>
            <p className="text-xs text-muted-foreground mt-1">tickets breached SLA</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Resolution</span>
            </div>
            <p className="text-2xl font-bold">{metrics.avgResolution}h</p>
            <p className="text-xs text-muted-foreground mt-1">average time to resolve</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">SLA Distribution</CardTitle>
            <CardDescription>On-time vs breached tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Compliance by Category</CardTitle>
            <CardDescription>SLA performance per category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Compliance"]}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.compliance >= 90 ? CHART_COLORS.onTime : entry.compliance >= 75 ? CHART_COLORS.warning : CHART_COLORS.breached} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">SLA Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Category</th>
                  <th className="text-center py-2 px-3 font-medium">Total</th>
                  <th className="text-center py-2 px-3 font-medium">On Time</th>
                  <th className="text-center py-2 px-3 font-medium">Breached</th>
                  <th className="text-center py-2 px-3 font-medium">Compliance</th>
                  <th className="text-center py-2 px-3 font-medium">Avg Time</th>
                  <th className="text-center py-2 px-3 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const compliance = row.total > 0 ? (row.onTime / row.total) * 100 : 0;
                  return (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">{row.categoryName || row.category}</td>
                      <td className="text-center py-2 px-3">{row.total}</td>
                      <td className="text-center py-2 px-3 text-emerald-600 dark:text-emerald-400">{row.onTime}</td>
                      <td className="text-center py-2 px-3 text-destructive">{row.breached}</td>
                      <td className="text-center py-2 px-3">
                        <Badge className={cn("text-xs", getComplianceBg(compliance))}>
                          {Math.round(compliance)}%
                        </Badge>
                      </td>
                      <td className="text-center py-2 px-3">{row.avgResolutionHours.toFixed(1)}h</td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{row.slaTargetHours}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
