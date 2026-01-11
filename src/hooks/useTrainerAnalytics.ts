import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrainerPerformanceData, 
  AnalyticsDashboardData,
  AIAnalysisResult,
  PERFORMANCE_CATEGORIES,
  ComprehensiveFeedbackFormData 
} from '@/lib/trainerAnalyticsTypes';
import { TRAINERS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

// Generate mock historical data for demonstration
const generateMockPerformanceData = (trainerId: string, trainerName: string, specialization: string): TrainerPerformanceData => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  
  const generateScore = (base: number, variance: number) => 
    Math.min(100, Math.max(0, base + (Math.random() - 0.5) * variance));
  
  const baseScore = 70 + Math.random() * 20;
  
  const categoryScores = PERFORMANCE_CATEGORIES.map(cat => ({
    ...cat,
    score: (generateScore(baseScore, 30) / 100) * cat.maxScore,
    comments: '',
    trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
    monthlyScores: months.map((m, i) => ({
      month: m,
      score: (generateScore(baseScore + (i * 0.5), 20) / 100) * cat.maxScore
    }))
  }));
  
  const overallScore = categoryScores.reduce((acc, cat) => acc + cat.score, 0);
  
  return {
    trainerId,
    trainerName,
    specialization,
    location: ['Kemps Corner', 'Mews', 'Bangalore'][Math.floor(Math.random() * 3)],
    overallScore,
    totalClassesTaught: Math.floor(400 + Math.random() * 300),
    avgClassAttendance: 3 + Math.random() * 4,
    avgRetentionRate: 20 + Math.random() * 30,
    avgConversionRate: 20 + Math.random() * 30,
    categoryScores,
    monthlyMetrics: months.map((month, i) => ({
      month,
      year: currentYear,
      location: 'Kemps Corner',
      classesTaught: Math.floor(30 + Math.random() * 30),
      avgAttendance: 3 + Math.random() * 4,
      attendanceGrowth: i === 0 ? null : (Math.random() - 0.5) * 40,
      conversionRate: Math.random() * 50,
      emptyClasses: Math.floor(Math.random() * 10),
      meetingAttendance: `${Math.floor(Math.random() * 6)}/6`
    })),
    clientFeedback: [
      {
        id: '1',
        date: '2024-01-15',
        type: 'client' as const,
        content: 'Great energy and clear instructions. Really enjoyed the class!',
        sentiment: 'positive' as const,
        rating: 4.5,
        tags: ['energy', 'instructions']
      },
      {
        id: '2',
        date: '2024-01-10',
        type: 'client' as const,
        content: 'Good class but started a bit late.',
        sentiment: 'neutral' as const,
        rating: 3.5,
        tags: ['punctuality']
      }
    ],
    internalFeedback: [
      {
        id: '3',
        date: '2024-01-20',
        type: 'internal' as const,
        content: 'Showing great improvement in client connection. Need to work on advanced class energy.',
        sentiment: 'positive' as const,
        reviewer: 'Management'
      }
    ],
    focusPoints: [{
      id: '1',
      month: 'January',
      year: currentYear,
      points: [
        'Creative choreography sequencing',
        'Increasing class average attendance',
        'Hold clients accountable'
      ],
      status: 'active'
    }],
    goals: [{
      id: '1',
      title: 'Complete Certification',
      deadline: '2024-06-30',
      status: 'in-progress',
      progress: 75
    }],
    historicalScores: months.map((m, i) => ({
      period: `${m} ${currentYear}`,
      score: generateScore(overallScore, 15)
    })),
    lastUpdated: new Date().toISOString(),
    reviewPeriod: `${currentYear}`
  };
};

export function useTrainerAnalytics(trainerId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trainer performance data
  const trainerDataQuery = useQuery({
    queryKey: ['trainer-analytics', trainerId],
    queryFn: async () => {
      if (!trainerId) return null;
      
      // Fetch tickets with trainer feedback
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('source', 'trainer-feedback')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      
      // Filter for specific trainer
      const trainerTickets = tickets?.filter(t => {
        const dynamicData = t.dynamicFieldData as any;
        return dynamicData?.trainerId === trainerId;
      }) || [];
      
      // Find trainer info
      const trainer = TRAINERS.find(t => t.id === trainerId);
      if (!trainer) return null;
      
      // Generate base data (in production, this would come from aggregated ticket data)
      const performanceData = generateMockPerformanceData(
        trainerId,
        trainer.name,
        trainer.specialization
      );
      
      // Merge with real feedback from tickets
      if (trainerTickets.length > 0) {
        performanceData.clientFeedback = trainerTickets.map(t => ({
          id: t.id,
          date: t.createdAt || new Date().toISOString(),
          type: 'client' as const,
          content: t.description,
          sentiment: ((t.dynamicFieldData as any)?.aiInsights?.sentiment || 'neutral') as any,
          rating: (t.dynamicFieldData as any)?.overallRating,
          tags: t.tags || []
        }));
      }
      
      return performanceData;
    },
    enabled: !!trainerId
  });

  // Fetch all trainers analytics dashboard data
  const dashboardQuery = useQuery({
    queryKey: ['trainer-analytics-dashboard'],
    queryFn: async (): Promise<AnalyticsDashboardData> => {
      // Fetch all trainer feedback tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('source', 'trainer-feedback')
        .order('createdAt', { ascending: false });
      
      // Generate performance data for all trainers
      const trainersData = TRAINERS.map(t => 
        generateMockPerformanceData(t.id, t.name, t.specialization)
      );
      
      // Calculate team averages
      const teamAverages = PERFORMANCE_CATEGORIES.map(cat => ({
        category: cat.label,
        average: trainersData.reduce((acc, t) => {
          const catScore = t.categoryScores.find(c => c.key === cat.key);
          return acc + (catScore?.score || 0);
        }, 0) / trainersData.length
      }));
      
      // Get top performers
      const topPerformers = trainersData
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 10)
        .map((t, i) => ({
          trainerId: t.trainerId,
          name: t.trainerName,
          overallScore: t.overallScore,
          categoryScores: t.categoryScores.reduce((acc, c) => {
            acc[c.key] = c.score;
            return acc;
          }, {} as { [key: string]: number }),
          rank: i + 1,
          trend: t.categoryScores[0]?.trend || 'stable'
        }));
      
      // Generate trends overview
      const trendsOverview = [
        { metric: 'Average Attendance', currentValue: 4.5, previousValue: 4.2, change: 7.1, trend: 'up' as const },
        { metric: 'Retention Rate', currentValue: 28, previousValue: 25, change: 12, trend: 'up' as const },
        { metric: 'Conversion Rate', currentValue: 32, previousValue: 35, change: -8.6, trend: 'down' as const },
        { metric: 'Overall Score', currentValue: 78.5, previousValue: 76.2, change: 3, trend: 'up' as const },
      ];
      
      // Generate alerts
      const alerts = trainersData
        .filter(t => t.overallScore < 60)
        .map(t => ({
          type: 'warning' as const,
          message: `${t.trainerName} has a low performance score (${t.overallScore.toFixed(1)})`,
          trainerId: t.trainerId,
          trainerName: t.trainerName
        }));
      
      return {
        trainers: trainersData,
        teamAverages,
        topPerformers,
        trendsOverview,
        alerts
      };
    }
  });

  // AI Analysis mutation
  const analyzePerformanceMutation = useMutation({
    mutationFn: async (data: TrainerPerformanceData): Promise<AIAnalysisResult> => {
      const { data: result, error } = await supabase.functions.invoke('analyze-trainer-performance', {
        body: {
          trainerData: data,
          analysisType: 'comprehensive'
        }
      });
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'AI Analysis Complete',
        description: `Performance score: ${data.overallScore.toFixed(1)}/100 (${data.severity})`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Submit comprehensive feedback
  const submitFeedbackMutation = useMutation({
    mutationFn: async (formData: ComprehensiveFeedbackFormData) => {
      const now = new Date();
      const ticketNumber = `TRN-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Calculate overall score
      const totalScore = Object.values(formData.categoryScores).reduce((a, b) => a + b, 0);
      const avgScore = totalScore / Object.keys(formData.categoryScores).length;
      
      // Determine priority based on score
      let priority = 'medium';
      if (avgScore < 50) priority = 'high';
      else if (avgScore >= 80) priority = 'low';
      
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('code', 'CS')
        .single();
      
      const { data: studios } = await supabase
        .from('studios')
        .select('id')
        .limit(1)
        .single();
      
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([{
          ticketNumber,
          title: `Performance Review - ${formData.trainerName} - ${formData.reviewPeriod}`,
          description: `**Comprehensive Trainer Performance Review**

**Trainer:** ${formData.trainerName}
**Review Period:** ${formData.reviewPeriod}
**Location:** ${formData.location}

**Overall Score:** ${totalScore.toFixed(1)}/100

**Category Breakdown:**
${Object.entries(formData.categoryScores).map(([key, score]) => `- ${key}: ${score.toFixed(1)}%`).join('\n')}

**Client Feedback:**
${formData.clientFeedback}

**Internal Feedback:**
${formData.internalFeedback}

**Focus Points:**
${formData.focusPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Goals:**
${formData.goals.map(g => `- ${g.title} (Due: ${g.deadline})`).join('\n')}

**Highlights:**
${formData.highlights}

**Concerns:**
${formData.concerns}

**Reviewed by:** ${formData.reviewerName} (${formData.reviewerRole})`,
          categoryId: categories?.id,
          studioId: studios?.id,
          priority,
          status: 'new',
          source: 'trainer-feedback',
          tags: ['performance-review', 'trainer-evaluation', formData.trainerName.toLowerCase().replace(' ', '-')],
          dynamicFieldData: {
            feedbackType: 'comprehensive-review',
            ...formData,
            overallScore: totalScore
          }
        }])
        .select()
        .single();
      
      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Performance review has been recorded successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['trainer-analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    trainerData: trainerDataQuery.data,
    isLoadingTrainer: trainerDataQuery.isLoading,
    dashboardData: dashboardQuery.data,
    isLoadingDashboard: dashboardQuery.isLoading,
    analyzePerformance: analyzePerformanceMutation.mutate,
    isAnalyzing: analyzePerformanceMutation.isPending,
    submitFeedback: submitFeedbackMutation.mutate,
    isSubmitting: submitFeedbackMutation.isPending
  };
}
