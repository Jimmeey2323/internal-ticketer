// Comprehensive Trainer Performance Analytics Types
// Based on Physique57 India Trainer Performance Review structure

export interface TrainerMonthlyMetrics {
  month: string;
  year: number;
  location: string;
  classesTaught: number;
  avgAttendance: number;
  attendanceGrowth: number | null;
  conversionRate: number | null;
  emptyClasses: number;
  meetingAttendance: string;
}

export interface TrainerPerformanceCategory {
  key: string;
  label: string;
  weightage: number;
  score: number;
  maxScore: number;
  comments?: string;
  trend?: 'up' | 'down' | 'stable';
  monthlyScores?: { month: string; score: number }[];
}

// Performance categories with weightage (totaling 100)
export const PERFORMANCE_CATEGORIES: Omit<TrainerPerformanceCategory, 'score' | 'comments' | 'monthlyScores'>[] = [
  { key: 'clientAttendance', label: 'Client Attendance', weightage: 12.5, maxScore: 12.5 },
  { key: 'clientRetention', label: 'Client Retention', weightage: 12.5, maxScore: 12.5 },
  { key: 'clientConnection', label: 'Client Connection & Communication', weightage: 12.5, maxScore: 12.5 },
  { key: 'clientFeedback', label: 'Client Feedback', weightage: 12.5, maxScore: 12.5 },
  { key: 'mindfulMoment', label: 'Mindful Moment / USP Integration / Motivation', weightage: 8, maxScore: 8 },
  { key: 'musicality', label: 'Musicality', weightage: 8, maxScore: 8 },
  { key: 'energyVocals', label: 'Energy and Vocals (Inflection, Intonation, Enunciation)', weightage: 8, maxScore: 8 },
  { key: 'choreography', label: 'Choreography & Sequencing', weightage: 8, maxScore: 8 },
  { key: 'learningStyles', label: 'Learning Styles & Use of Names', weightage: 8, maxScore: 8 },
  { key: 'workEthics', label: 'Classes, Workshops, Meetings & Work Ethics', weightage: 10, maxScore: 10 },
];

export interface TrainerQualitativeFeedback {
  id: string;
  date: string;
  type: 'client' | 'internal' | 'management';
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  rating?: number;
  reviewer?: string;
  tags?: string[];
}

export interface TrainerFocusPoint {
  id: string;
  month: string;
  year: number;
  points: string[];
  status: 'active' | 'completed' | 'in-progress';
}

export interface TrainerGoal {
  id: string;
  title: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  description?: string;
  progress: number;
}

export interface AIAnalysisResult {
  overallScore: number;
  severity: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  trends: {
    category: string;
    direction: 'improving' | 'declining' | 'stable';
    percentageChange: number;
  }[];
  patterns: {
    pattern: string;
    frequency: number;
    impact: 'high' | 'medium' | 'low';
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    recommendation: string;
    expectedImpact: string;
  }[];
  strengths: string[];
  areasForImprovement: string[];
  predictedScore: number;
  riskFactors: string[];
}

export interface TrainerPerformanceData {
  trainerId: string;
  trainerName: string;
  specialization: string;
  location: string;
  
  // Overall metrics
  overallScore: number;
  totalClassesTaught: number;
  avgClassAttendance: number;
  avgRetentionRate: number;
  avgConversionRate: number;
  
  // Category scores
  categoryScores: TrainerPerformanceCategory[];
  
  // Monthly breakdown
  monthlyMetrics: TrainerMonthlyMetrics[];
  
  // Qualitative feedback
  clientFeedback: TrainerQualitativeFeedback[];
  internalFeedback: TrainerQualitativeFeedback[];
  
  // Focus points and goals
  focusPoints: TrainerFocusPoint[];
  goals: TrainerGoal[];
  
  // AI Analysis
  aiAnalysis?: AIAnalysisResult;
  
  // Historical data for trends
  historicalScores: { period: string; score: number }[];
  
  // Timestamps
  lastUpdated: string;
  reviewPeriod: string;
}

export interface TrainerComparisonData {
  trainerId: string;
  name: string;
  overallScore: number;
  categoryScores: { [key: string]: number };
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsDashboardData {
  trainers: TrainerPerformanceData[];
  teamAverages: { category: string; average: number }[];
  topPerformers: TrainerComparisonData[];
  trendsOverview: {
    metric: string;
    currentValue: number;
    previousValue: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  alerts: {
    type: 'warning' | 'critical' | 'info';
    message: string;
    trainerId?: string;
    trainerName?: string;
  }[];
}

// Form data for submitting comprehensive feedback
export interface ComprehensiveFeedbackFormData {
  trainerId: string;
  trainerName: string;
  reviewPeriod: string;
  location: string;
  
  // Monthly metrics
  monthlyData: {
    month: string;
    classesTaught: number;
    avgAttendance: number;
    emptyClasses: number;
    conversionRate: number;
  }[];
  
  // Category scores (0-100 normalized)
  categoryScores: { [key: string]: number };
  
  // Qualitative feedback
  clientFeedback: string;
  internalFeedback: string;
  
  // Focus points and goals
  focusPoints: string[];
  goals: { title: string; deadline: string }[];
  
  // Additional notes
  highlights: string;
  concerns: string;
  
  // Reviewer info
  reviewerName: string;
  reviewerRole: string;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
  [key: string]: string | number | undefined;
}

export interface TrendChartData {
  period: string;
  [trainerName: string]: string | number;
}

export interface RadarChartData {
  category: string;
  trainer: number;
  teamAverage: number;
  fullMark: number;
}
