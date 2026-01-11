import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Star,
  Upload,
  FileText,
  User,
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Music,
  Users,
  Dumbbell,
  MessageSquare,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Thermometer,
  Heart,
  Brain,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Search,
} from "lucide-react";
import { ClassSelector, type ClassSession } from "@/components/class-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TRAINERS, CLASSES, STUDIOS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

interface ComprehensiveTrainerFeedbackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Evaluation categories based on user requirements
const EVALUATION_CATEGORIES = [
  { 
    key: "technicalExecution", 
    label: "Technical Execution", 
    icon: Target,
    description: "Accuracy of form cues and corrections",
    weight: 20
  },
  { 
    key: "classStructure", 
    label: "Class Structure", 
    icon: Dumbbell,
    description: "Warm-up, main workout, cool-down flow",
    weight: 15
  },
  { 
    key: "energyMotivation", 
    label: "Energy & Motivation", 
    icon: Zap,
    description: "Enthusiasm and ability to motivate",
    weight: 20
  },
  { 
    key: "musicTiming", 
    label: "Music & Timing", 
    icon: Music,
    description: "Beat matching and playlist quality",
    weight: 10
  },
  { 
    key: "communication", 
    label: "Communication", 
    icon: MessageSquare,
    description: "Clarity of instructions and cues",
    weight: 15
  },
  { 
    key: "customerEngagement", 
    label: "Customer Engagement", 
    icon: Users,
    description: "Personal attention and inclusivity",
    weight: 15
  },
  { 
    key: "professionalism", 
    label: "Professionalism", 
    icon: Award,
    description: "Punctuality, attire, conduct",
    weight: 5
  },
];

// Rating options for each category
const RATING_OPTIONS = [
  { value: 5, label: "Excellent", color: "text-emerald-500" },
  { value: 4, label: "Good", color: "text-blue-500" },
  { value: 3, label: "Average", color: "text-amber-500" },
  { value: 2, label: "Below Average", color: "text-orange-500" },
  { value: 1, label: "Poor", color: "text-red-500" },
];

// Quick feedback options
const QUICK_FEEDBACK_POSITIVE = [
  "Great energy throughout",
  "Excellent form corrections",
  "Perfect music selection",
  "Very motivating",
  "Clear instructions",
  "Good pace management",
  "Engaging personality",
  "Professional conduct",
];

const QUICK_FEEDBACK_IMPROVEMENT = [
  "Music too loud/quiet",
  "Pace too fast/slow",
  "More form corrections needed",
  "Improve cueing clarity",
  "Better time management",
  "More member interaction",
  "Variation in exercises",
  "Equipment setup issues",
];

interface EvaluationScores {
  technicalExecution: number;
  classStructure: number;
  energyMotivation: number;
  musicTiming: number;
  communication: number;
  customerEngagement: number;
  professionalism: number;
  [key: string]: number;
}

interface FeedbackFormData {
  // Class Selection
  trainerId: string;
  trainerName: string;
  classType: string;
  classDate: string;
  classTime: string;
  studioId: string;
  studioName: string;
  
  // Evaluation Scores
  scores: EvaluationScores;
  overallRating: number;
  
  // Quick Feedback
  positiveHighlights: string[];
  improvementAreas: string[];
  
  // Detailed Feedback
  detailedFeedback: string;
  
  // Class Metrics
  classCapacity: number;
  attendeeCount: number;
  newMemberCount: number;
  
  // Customer Info (optional)
  feedbackSource: 'staff' | 'member' | 'observation' | 'complaint';
  memberName?: string;
  memberEmail?: string;
  isAnonymous: boolean;
}

export function ComprehensiveTrainerFeedback({ open, onOpenChange }: ComprehensiveTrainerFeedbackProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<FeedbackFormData>({
    trainerId: "",
    trainerName: "",
    classType: "",
    classDate: new Date().toISOString().split('T')[0],
    classTime: "",
    studioId: "",
    studioName: "",
    scores: {
      technicalExecution: 3,
      classStructure: 3,
      energyMotivation: 3,
      musicTiming: 3,
      communication: 3,
      customerEngagement: 3,
      professionalism: 3,
    },
    overallRating: 3,
    positiveHighlights: [],
    improvementAreas: [],
    detailedFeedback: "",
    classCapacity: 25,
    attendeeCount: 0,
    newMemberCount: 0,
    feedbackSource: 'staff',
    isAnonymous: false,
  });

  const filteredTrainers = TRAINERS.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTrainerSelect = (trainer: typeof TRAINERS[0]) => {
    setFormData(prev => ({
      ...prev,
      trainerId: trainer.id,
      trainerName: trainer.name,
    }));
    setActiveStep(2);
  };

  const handleClassSelect = (session: ClassSession | null) => {
    setSelectedClass(session);
    if (session) {
      const classDate = session.startsAt 
        ? new Date(session.startsAt).toISOString().split('T')[0]
        : formData.classDate;
      const classTime = session.startsAt
        ? new Date(session.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';
      
      setFormData(prev => ({
        ...prev,
        classType: session.name || '',
        classDate,
        classTime,
        studioName: session.host?.displayName || '',
      }));

      if (session.teacher) {
        const teacherName = `${session.teacher.firstName} ${session.teacher.lastName}`.trim();
        const matchingTrainer = TRAINERS.find(t => 
          t.name.toLowerCase().includes(teacherName.toLowerCase())
        );
        if (matchingTrainer) {
          setFormData(prev => ({
            ...prev,
            trainerId: matchingTrainer.id,
            trainerName: matchingTrainer.name,
          }));
        }
      }
    }
  };

  const updateScore = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [category]: value }
    }));
  };

  const toggleQuickFeedback = (type: 'positive' | 'improvement', item: string) => {
    setFormData(prev => {
      const key = type === 'positive' ? 'positiveHighlights' : 'improvementAreas';
      const current = prev[key];
      if (current.includes(item)) {
        return { ...prev, [key]: current.filter(i => i !== item) };
      }
      return { ...prev, [key]: [...current, item] };
    });
  };

  const calculateOverallScore = (): number => {
    let totalWeight = 0;
    let weightedSum = 0;
    
    EVALUATION_CATEGORIES.forEach(cat => {
      weightedSum += formData.scores[cat.key] * cat.weight;
      totalWeight += cat.weight;
    });
    
    return Math.round((weightedSum / totalWeight) * 20) / 10; // Scale to 5
  };

  const analyzeFeedback = async () => {
    if (!formData.detailedFeedback && formData.positiveHighlights.length === 0 && formData.improvementAreas.length === 0) {
      toast({
        title: "No feedback to analyze",
        description: "Please add some feedback first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const feedbackText = [
        ...formData.positiveHighlights.map(h => `Positive: ${h}`),
        ...formData.improvementAreas.map(a => `Needs improvement: ${a}`),
        formData.detailedFeedback
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
        body: {
          title: `Trainer Evaluation - ${formData.trainerName}`,
          description: feedbackText,
          feedback: feedbackText,
          trainerName: formData.trainerName,
        },
      });

      if (error) throw error;

      setAiInsights(data);
      toast({
        title: "Analysis complete",
        description: "AI insights have been generated.",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.trainerName) {
      toast({
        title: "Trainer required",
        description: "Please select a trainer.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.classType) {
      toast({
        title: "Class required",
        description: "Please select a class type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const overallScore = calculateOverallScore();
      
      // Generate ticket number
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const ticketNumber = `TKT-${year}${month}${day}-${random}`;

      // Get category ID for "Customer Service" or first available
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('isActive', true);
      
      const customerServiceCategory = categories?.find(c => 
        c.name.toLowerCase().includes('customer') || c.name.toLowerCase().includes('service')
      );
      
      // Get studio
      const { data: studios } = await supabase
        .from('studios')
        .select('id')
        .limit(1)
        .single();

      // Build comprehensive description
      const description = `**Trainer Performance Evaluation**

**Trainer:** ${formData.trainerName}
**Class:** ${formData.classType}
**Date:** ${formData.classDate} ${formData.classTime}
**Location:** ${formData.studioName || 'Not specified'}

---

**Performance Scores (1-5 scale):**
${EVALUATION_CATEGORIES.map(cat => 
  `• ${cat.label}: ${formData.scores[cat.key]}/5`
).join('\n')}

**Overall Score:** ${overallScore.toFixed(1)}/5 ⭐

---

**Class Metrics:**
• Capacity: ${formData.classCapacity}
• Attendees: ${formData.attendeeCount}
• New Members: ${formData.newMemberCount}
• Fill Rate: ${Math.round((formData.attendeeCount / formData.classCapacity) * 100)}%

---

**Highlights:**
${formData.positiveHighlights.length > 0 
  ? formData.positiveHighlights.map(h => `✓ ${h}`).join('\n')
  : 'None noted'}

**Areas for Improvement:**
${formData.improvementAreas.length > 0
  ? formData.improvementAreas.map(a => `→ ${a}`).join('\n')
  : 'None noted'}

---

**Detailed Feedback:**
${formData.detailedFeedback || 'No additional comments'}

---

**Feedback Source:** ${formData.feedbackSource.charAt(0).toUpperCase() + formData.feedbackSource.slice(1)}
${!formData.isAnonymous && formData.memberName ? `**Member:** ${formData.memberName}` : ''}
${!formData.isAnonymous && formData.memberEmail ? `**Contact:** ${formData.memberEmail}` : ''}

${aiInsights ? `
---
**AI Analysis:**
• Sentiment: ${aiInsights.sentiment}
• Score: ${aiInsights.score}/100
${aiInsights.insights ? `• Insights: ${aiInsights.insights}` : ''}
` : ''}`;

      // Determine priority based on overall score
      let priority = 'low';
      if (overallScore < 2) priority = 'high';
      else if (overallScore < 3) priority = 'medium';

      const feedbackType = overallScore >= 4 ? 'positive-evaluation' : 
                          overallScore < 2.5 ? 'performance-concern' : 'evaluation';

      // Create the ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([{
          ticketNumber,
          title: `Trainer Evaluation - ${formData.trainerName} - ${formData.classType} (${formData.classDate})`,
          description,
          categoryId: customerServiceCategory?.id || categories?.[0]?.id,
          studioId: studios?.id,
          priority,
          status: 'new',
          source: 'trainer-evaluation',
          tags: ['trainer-evaluation', formData.classType?.toLowerCase().replace(/\s+/g, '-'), feedbackType].filter(Boolean),
          reportedByUserId: user?.id,
          dynamicFieldData: {
            trainerId: formData.trainerId,
            trainerName: formData.trainerName,
            classType: formData.classType,
            classDate: formData.classDate,
            classTime: formData.classTime,
            studioName: formData.studioName,
            scores: formData.scores,
            overallScore,
            positiveHighlights: formData.positiveHighlights,
            improvementAreas: formData.improvementAreas,
            classCapacity: formData.classCapacity,
            attendeeCount: formData.attendeeCount,
            newMemberCount: formData.newMemberCount,
            feedbackSource: formData.feedbackSource,
            isAnonymous: formData.isAnonymous,
            aiInsights: aiInsights || null,
            feedbackType: 'comprehensive-trainer-evaluation',
          },
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Evaluation Submitted",
        description: `Ticket ${ticketNumber} has been created for ${formData.trainerName}.`,
      });
      
      // Reset and close
      setFormData({
        trainerId: "",
        trainerName: "",
        classType: "",
        classDate: new Date().toISOString().split('T')[0],
        classTime: "",
        studioId: "",
        studioName: "",
        scores: {
          technicalExecution: 3,
          classStructure: 3,
          energyMotivation: 3,
          musicTiming: 3,
          communication: 3,
          customerEngagement: 3,
          professionalism: 3,
        },
        overallRating: 3,
        positiveHighlights: [],
        improvementAreas: [],
        detailedFeedback: "",
        classCapacity: 25,
        attendeeCount: 0,
        newMemberCount: 0,
        feedbackSource: 'staff',
        isAnonymous: false,
      });
      setSelectedClass(null);
      setAiInsights(null);
      setActiveStep(1);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting evaluation:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const overallScore = calculateOverallScore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            Trainer Performance Evaluation
          </DialogTitle>
          <DialogDescription>
            Complete a comprehensive evaluation for a trainer's class performance
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => step <= activeStep && setActiveStep(step)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    activeStep >= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step}
                </button>
                {step < 4 && (
                  <div className={cn(
                    "flex-1 h-1 rounded-full transition-all",
                    activeStep > step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Select Trainer</span>
            <span>Class Info</span>
            <span>Evaluation</span>
            <span>Review</span>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-250px)]">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Select Trainer */}
              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search trainers by name or specialization..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredTrainers.map((trainer) => (
                      <Card
                        key={trainer.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-lg",
                          formData.trainerId === trainer.id && "ring-2 ring-primary"
                        )}
                        onClick={() => handleTrainerSelect(trainer)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {trainer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{trainer.name}</p>
                              <Badge variant="secondary" className="text-xs">
                                {trainer.specialization}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Class Information */}
              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Class Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Class Type</Label>
                          <Select
                            value={formData.classType}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, classType: v }))}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {CLASSES.map(cls => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Select
                            value={formData.studioName}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, studioName: v }))}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select studio" />
                            </SelectTrigger>
                            <SelectContent>
                              {STUDIOS.map(studio => (
                                <SelectItem key={studio.id} value={studio.name}>{studio.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={formData.classDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, classDate: e.target.value }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Time</Label>
                          <Input
                            type="time"
                            value={formData.classTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, classTime: e.target.value }))}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Class Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Class Capacity</Label>
                          <Input
                            type="number"
                            value={formData.classCapacity}
                            onChange={(e) => setFormData(prev => ({ ...prev, classCapacity: parseInt(e.target.value) || 0 }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Attendees</Label>
                          <Input
                            type="number"
                            value={formData.attendeeCount}
                            onChange={(e) => setFormData(prev => ({ ...prev, attendeeCount: parseInt(e.target.value) || 0 }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>New Members</Label>
                          <Input
                            type="number"
                            value={formData.newMemberCount}
                            onChange={(e) => setFormData(prev => ({ ...prev, newMemberCount: parseInt(e.target.value) || 0 }))}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveStep(1)} className="rounded-xl">
                      Back
                    </Button>
                    <Button 
                      onClick={() => setActiveStep(3)} 
                      disabled={!formData.classType}
                      className="rounded-xl"
                    >
                      Continue to Evaluation
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Evaluation Scores */}
              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Score Categories */}
                  <div className="space-y-4">
                    {EVALUATION_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      return (
                        <Card key={category.key}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{category.label}</p>
                                  <p className="text-xs text-muted-foreground">{category.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <button
                                    key={value}
                                    onClick={() => updateScore(category.key, value)}
                                    className={cn(
                                      "h-10 w-10 rounded-lg transition-all text-sm font-medium",
                                      formData.scores[category.key] === value
                                        ? "bg-primary text-primary-foreground shadow-lg scale-110"
                                        : "bg-muted hover:bg-muted/80"
                                    )}
                                  >
                                    {value}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Quick Feedback */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-emerald-500" />
                        Positive Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_FEEDBACK_POSITIVE.map((item) => (
                          <Badge
                            key={item}
                            variant={formData.positiveHighlights.includes(item) ? "default" : "outline"}
                            className="cursor-pointer transition-all"
                            onClick={() => toggleQuickFeedback('positive', item)}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_FEEDBACK_IMPROVEMENT.map((item) => (
                          <Badge
                            key={item}
                            variant={formData.improvementAreas.includes(item) ? "default" : "outline"}
                            className="cursor-pointer transition-all"
                            onClick={() => toggleQuickFeedback('improvement', item)}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Feedback */}
                  <div className="space-y-2">
                    <Label>Detailed Comments (Optional)</Label>
                    <Textarea
                      value={formData.detailedFeedback}
                      onChange={(e) => setFormData(prev => ({ ...prev, detailedFeedback: e.target.value }))}
                      placeholder="Add any specific observations, suggestions, or context..."
                      className="rounded-xl min-h-[100px]"
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveStep(2)} className="rounded-xl">
                      Back
                    </Button>
                    <Button onClick={() => setActiveStep(4)} className="rounded-xl">
                      Review & Submit
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review & Submit */}
              {activeStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Summary Card */}
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                              {formData.trainerName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-xl font-bold">{formData.trainerName}</h3>
                            <p className="text-muted-foreground">{formData.classType}</p>
                            <p className="text-sm text-muted-foreground">
                              {formData.classDate} • {formData.classTime} • {formData.studioName}
                            </p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={cn(
                            "text-4xl font-bold",
                            overallScore >= 4 ? "text-emerald-500" :
                            overallScore >= 3 ? "text-amber-500" : "text-red-500"
                          )}>
                            {overallScore.toFixed(1)}
                          </div>
                          <p className="text-sm text-muted-foreground">Overall Score</p>
                          <div className="flex items-center gap-1 mt-1 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-4 w-4",
                                  star <= Math.round(overallScore)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Performance Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {EVALUATION_CATEGORIES.map((cat) => (
                        <div key={cat.key} className="flex items-center gap-3">
                          <span className="text-sm w-40 truncate">{cat.label}</span>
                          <Progress value={formData.scores[cat.key] * 20} className="flex-1 h-2" />
                          <span className="text-sm font-medium w-8">{formData.scores[cat.key]}/5</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Highlights & Improvements */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-emerald-500" />
                          Highlights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {formData.positiveHighlights.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {formData.positiveHighlights.map((h, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">None selected</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Improvements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {formData.improvementAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {formData.improvementAreas.map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">None selected</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Analysis Button */}
                  {!aiInsights && (
                    <Button
                      variant="outline"
                      onClick={analyzeFeedback}
                      disabled={isAnalyzing}
                      className="w-full rounded-xl gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate AI Insights
                        </>
                      )}
                    </Button>
                  )}

                  {/* AI Insights */}
                  {aiInsights && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-primary">AI Analysis</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Sentiment: {aiInsights.sentiment} • Score: {aiInsights.score}/100
                            </p>
                            {aiInsights.insights && (
                              <p className="text-sm mt-2">{aiInsights.insights}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Feedback Source */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Feedback Source</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup
                        value={formData.feedbackSource}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, feedbackSource: v as any }))}
                        className="flex flex-wrap gap-4"
                      >
                        {[
                          { value: 'staff', label: 'Staff Observation' },
                          { value: 'member', label: 'Member Feedback' },
                          { value: 'observation', label: 'Mystery Shopper' },
                          { value: 'complaint', label: 'Complaint Follow-up' },
                        ].map((opt) => (
                          <div key={opt.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value} id={opt.value} />
                            <Label htmlFor={opt.value}>{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveStep(3)} className="rounded-xl">
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Submit Evaluation
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
