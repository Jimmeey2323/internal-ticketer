import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Scatter, ScatterChart, ZAxis
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Target,
  Brain, Sparkles, BarChart3, PieChartIcon, Activity, Users,
  Calendar, ArrowUpRight, ArrowDownRight, RefreshCw, Download,
  Filter, ChevronDown, Zap, Shield, Star, Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrainerAnalytics } from '@/hooks/useTrainerAnalytics';
import { PERFORMANCE_CATEGORIES, AIAnalysisResult } from '@/lib/trainerAnalyticsTypes';
import { TRAINERS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];
const SEVERITY_COLORS = {
  excellent: 'bg-emerald-500',
  good: 'bg-blue-500',
  'needs-improvement': 'bg-amber-500',
  critical: 'bg-red-500'
};

interface TrainerAnalyticsDashboardProps {
  selectedTrainerId?: string;
  onTrainerSelect?: (trainerId: string) => void;
}

export function TrainerAnalyticsDashboard({ selectedTrainerId, onTrainerSelect }: TrainerAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('year');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  
  const { 
    trainerData, 
    isLoadingTrainer, 
    dashboardData, 
    isLoadingDashboard,
    analyzePerformance,
    isAnalyzing 
  } = useTrainerAnalytics(selectedTrainerId);

  // Prepare chart data
  const trendChartData = useMemo(() => {
    if (!trainerData?.historicalScores) return [];
    return trainerData.historicalScores.map(h => ({
      period: h.period.split(' ')[0],
      score: h.score,
      target: 80
    }));
  }, [trainerData]);

  const categoryChartData = useMemo(() => {
    if (!trainerData?.categoryScores) return [];
    return trainerData.categoryScores.map(c => ({
      category: c.label.split(' ').slice(0, 2).join(' '),
      score: (c.score / c.maxScore) * 100,
      maxScore: 100
    }));
  }, [trainerData]);

  const radarChartData = useMemo(() => {
    if (!trainerData?.categoryScores) return [];
    const teamAvg = dashboardData?.teamAverages || [];
    return trainerData.categoryScores.map(c => {
      const teamCat = teamAvg.find(t => t.category === c.label);
      return {
        category: c.label.split(' ')[0],
        trainer: (c.score / c.maxScore) * 100,
        teamAverage: teamCat ? (teamCat.average / c.maxScore) * 100 : 50,
        fullMark: 100
      };
    });
  }, [trainerData, dashboardData]);

  const pieChartData = useMemo(() => {
    if (!trainerData?.categoryScores) return [];
    return trainerData.categoryScores.map((c, i) => ({
      name: c.label.split(' ').slice(0, 2).join(' '),
      value: c.score,
      fill: COLORS[i % COLORS.length]
    }));
  }, [trainerData]);

  const monthlyMetricsData = useMemo(() => {
    if (!trainerData?.monthlyMetrics) return [];
    return trainerData.monthlyMetrics.map(m => ({
      month: m.month,
      attendance: m.avgAttendance,
      conversion: m.conversionRate || 0,
      classes: m.classesTaught
    }));
  }, [trainerData]);

  if (isLoadingDashboard && !selectedTrainerId) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedTrainerId || ''} onValueChange={onTrainerSelect}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select trainer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trainers</SelectItem>
              {TRAINERS.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedTrainerId && trainerData && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => analyzePerformance(trainerData)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              AI Analysis
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Score"
          value={trainerData?.overallScore?.toFixed(1) || dashboardData?.trainers.reduce((a, t) => a + t.overallScore, 0) / (dashboardData?.trainers.length || 1).toFixed(1) || '0'}
          suffix="/100"
          icon={<Award className="h-5 w-5" />}
          trend={8.5}
          color="primary"
        />
        <MetricCard
          title="Avg Attendance"
          value={trainerData?.avgClassAttendance?.toFixed(1) || '4.5'}
          icon={<Users className="h-5 w-5" />}
          trend={7.2}
          color="emerald"
        />
        <MetricCard
          title="Retention Rate"
          value={trainerData?.avgRetentionRate?.toFixed(0) || '28'}
          suffix="%"
          icon={<Target className="h-5 w-5" />}
          trend={12}
          color="blue"
        />
        <MetricCard
          title="Classes Taught"
          value={trainerData?.totalClassesTaught?.toString() || '591'}
          icon={<Calendar className="h-5 w-5" />}
          trend={5}
          color="amber"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                    />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Skills Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Trainer" dataKey="trainer" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                    <Radar name="Team Avg" dataKey="teamAverage" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Trend
              </CardTitle>
              <div className="flex gap-2">
                {(['area', 'bar', 'line'] as const).map(type => (
                  <Button
                    key={type}
                    variant={chartType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'area' ? (
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#scoreGradient)" />
                    <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Category Scores</CardTitle>
                <CardDescription>Detailed breakdown by performance category</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {trainerData?.categoryScores?.map((cat, i) => (
                      <motion.div
                        key={cat.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{cat.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{cat.score.toFixed(1)}/{cat.maxScore}</span>
                            {cat.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                            {cat.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            {cat.trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                        <Progress value={(cat.score / cat.maxScore) * 100} className="h-2" />
                      </motion.div>
                    )) || PERFORMANCE_CATEGORIES.map((cat, i) => (
                      <div key={cat.key} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{cat.label}</span>
                          <span className="text-sm text-muted-foreground">—</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Score Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyMetricsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="classes" fill="hsl(var(--primary))" name="Classes" />
                  <Line yAxisId="right" type="monotone" dataKey="attendance" stroke="#82ca9d" name="Avg Attendance" />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#ffc658" name="Conversion %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Trends */}
            {trainerData?.categoryScores?.slice(0, 4).map((cat, i) => (
              <Card key={cat.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    {cat.label}
                    <Badge variant={cat.trend === 'up' ? 'default' : cat.trend === 'down' ? 'destructive' : 'secondary'}>
                      {cat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                       cat.trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : 
                       <Minus className="h-3 w-3 mr-1" />}
                      {cat.trend}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={cat.monthlyScores}>
                      <defs>
                        <linearGradient id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, cat.maxScore]} hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke={COLORS[i]} fill={`url(#gradient-${i})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Leaderboard</CardTitle>
              <CardDescription>Top performers by overall score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.topPerformers.slice(0, 10).map((performer, i) => (
                  <motion.div
                    key={performer.trainerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg",
                      performer.trainerId === selectedTrainerId && "bg-primary/10 ring-1 ring-primary"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                      i === 0 ? "bg-amber-500 text-white" :
                      i === 1 ? "bg-gray-400 text-white" :
                      i === 2 ? "bg-amber-700 text-white" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {performer.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{performer.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {performer.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                        {performer.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {performer.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                        <Progress value={performer.overallScore} className="h-2 flex-1" />
                      </div>
                    </div>
                    <span className="font-bold text-lg">{performer.overallScore.toFixed(1)}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          {trainerData?.aiAnalysis ? (
            <AIInsightsPanel analysis={trainerData.aiAnalysis} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Analysis Not Available</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Click the "AI Analysis" button to generate comprehensive insights
                </p>
                {selectedTrainerId && trainerData && (
                  <Button onClick={() => analyzePerformance(trainerData)} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Analysis
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  trend?: number;
  color: 'primary' | 'emerald' | 'blue' | 'amber' | 'red';
}

function MetricCard({ title, value, suffix, icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 text-primary',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-500',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-500',
    red: 'from-red-500/20 to-red-500/5 text-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorClasses[color])} />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{title}</span>
              <div className={cn("p-2 rounded-lg bg-background/80", colorClasses[color].split(' ')[2])}>
                {icon}
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{value}</span>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
            {trend !== undefined && (
              <div className={cn("flex items-center gap-1 mt-1 text-sm", trend >= 0 ? "text-emerald-500" : "text-red-500")}>
                {trend >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                <span>{Math.abs(trend).toFixed(1)}%</span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// AI Insights Panel Component
function AIInsightsPanel({ analysis }: { analysis: AIAnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn("inline-flex h-12 w-12 rounded-full items-center justify-center mb-2", SEVERITY_COLORS[analysis.severity])}>
              <Award className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold">{analysis.overallScore.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground capitalize">{analysis.severity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="inline-flex h-12 w-12 rounded-full items-center justify-center mb-2 bg-blue-500">
              <Target className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold">{analysis.predictedScore.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Predicted Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="inline-flex h-12 w-12 rounded-full items-center justify-center mb-2 bg-purple-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold">{(analysis.confidence * 100).toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Confidence</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="inline-flex h-12 w-12 rounded-full items-center justify-center mb-2 bg-amber-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold">{analysis.riskFactors.length}</p>
            <p className="text-sm text-muted-foreground">Risk Factors</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                  {rec.priority}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium">{rec.recommendation}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Expected Impact:</span> {rec.expectedImpact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-500">
              <Star className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  </div>
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Target className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.areasForImprovement.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowUpRight className="h-3 w-3 text-amber-500" />
                  </div>
                  <span className="text-sm">{a}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Trends & Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.trends.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">{t.category}</span>
                  <div className="flex items-center gap-2">
                    {t.direction === 'improving' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                    {t.direction === 'declining' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {t.direction === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span className={cn(
                      "text-sm font-medium",
                      t.percentageChange > 0 ? "text-emerald-500" : t.percentageChange < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {t.percentageChange > 0 ? '+' : ''}{t.percentageChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Detected Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.patterns.map((p, i) => (
                <div key={i} className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.pattern}</span>
                    <Badge variant={p.impact === 'high' ? 'destructive' : p.impact === 'medium' ? 'default' : 'secondary'}>
                      {p.impact} impact
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Frequency: {p.frequency}x observed</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default TrainerAnalyticsDashboard;
