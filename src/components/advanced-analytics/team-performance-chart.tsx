import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Users, Trophy, Clock, Target, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMemberPerformance {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  ticketsResolved: number;
  ticketsAssigned: number;
  avgResolutionTime: number; // hours
  slaCompliance: number; // percentage
  customerSatisfaction: number; // 1-5 rating
  firstResponseTime: number; // hours
}

interface TeamPerformance {
  teamId: string;
  teamName: string;
  members: TeamMemberPerformance[];
  totalResolved: number;
  avgResolutionTime: number;
  slaCompliance: number;
}

interface TeamPerformanceChartProps {
  teams: TeamPerformance[];
  className?: string;
}

export function TeamPerformanceChart({ teams, className }: TeamPerformanceChartProps) {
  const allMembers = useMemo(() => 
    teams.flatMap(t => t.members).sort((a, b) => b.ticketsResolved - a.ticketsResolved)
  , [teams]);

  const topPerformers = useMemo(() => 
    allMembers.slice(0, 5)
  , [allMembers]);

  const teamComparisonData = useMemo(() => 
    teams.map(t => ({
      name: t.teamName.slice(0, 15),
      resolved: t.totalResolved,
      avgTime: t.avgResolutionTime,
      compliance: t.slaCompliance,
    }))
  , [teams]);

  const radarData = useMemo(() => {
    if (teams.length === 0) return [];
    
    const metrics = ["Tickets", "Speed", "SLA", "Response", "CSAT"];
    return metrics.map((metric, idx) => {
      const data: Record<string, any> = { metric };
      teams.slice(0, 3).forEach(team => {
        let value = 0;
        switch (idx) {
          case 0: // Tickets
            value = Math.min(100, (team.totalResolved / Math.max(...teams.map(t => t.totalResolved))) * 100);
            break;
          case 1: // Speed (inverse - lower is better)
            const maxTime = Math.max(...teams.map(t => t.avgResolutionTime));
            value = maxTime > 0 ? (1 - team.avgResolutionTime / maxTime) * 100 : 100;
            break;
          case 2: // SLA
            value = team.slaCompliance;
            break;
          case 3: // Response (inverse - lower is better)
            const avgFirstResponse = team.members.length > 0 
              ? team.members.reduce((sum, m) => sum + m.firstResponseTime, 0) / team.members.length 
              : 0;
            const maxResponse = Math.max(...teams.flatMap(t => t.members.map(m => m.firstResponseTime)));
            value = maxResponse > 0 ? (1 - avgFirstResponse / maxResponse) * 100 : 100;
            break;
          case 4: // CSAT
            const avgCSAT = team.members.length > 0 
              ? team.members.reduce((sum, m) => sum + m.customerSatisfaction, 0) / team.members.length 
              : 0;
            value = (avgCSAT / 5) * 100;
            break;
        }
        data[team.teamName] = Math.round(value);
      });
      return data;
    });
  }, [teams]);

  const getPerformanceColor = (compliance: number) => {
    if (compliance >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (compliance >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Team Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Comparison
            </CardTitle>
            <CardDescription>Performance across all teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamComparisonData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="resolved" name="Resolved" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Performance Radar
            </CardTitle>
            <CardDescription>Multi-dimensional team comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    {teams.slice(0, 3).map((team, idx) => (
                      <Radar
                        key={team.teamId}
                        name={team.teamName}
                        dataKey={team.teamName}
                        stroke={`hsl(var(--chart-${idx + 1}))`}
                        fill={`hsl(var(--chart-${idx + 1}))`}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No team data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Individual performance leaders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No performance data available</p>
            ) : (
              topPerformers.map((member, idx) => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {idx < 3 && (
                        <div className={cn(
                          "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          idx === 0 ? "bg-amber-500 text-white" :
                          idx === 1 ? "bg-slate-400 text-white" :
                          "bg-amber-700 text-white"
                        )}>
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold">{member.ticketsResolved}</p>
                      <p className="text-[10px] text-muted-foreground">Resolved</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{member.avgResolutionTime.toFixed(1)}h</p>
                      <p className="text-[10px] text-muted-foreground">Avg Time</p>
                    </div>
                    <div>
                      <p className={cn("text-lg font-bold", getPerformanceColor(member.slaCompliance))}>
                        {member.slaCompliance}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">SLA</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <p className="text-lg font-bold">{member.customerSatisfaction.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <Card key={team.teamId} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{team.teamName}</CardTitle>
              <CardDescription>{team.members.length} members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tickets Resolved</span>
                <span className="font-medium">{team.totalResolved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Resolution</span>
                <span className="font-medium">{team.avgResolutionTime.toFixed(1)}h</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SLA Compliance</span>
                  <span className={cn("font-medium", getPerformanceColor(team.slaCompliance))}>
                    {team.slaCompliance}%
                  </span>
                </div>
                <Progress value={team.slaCompliance} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
