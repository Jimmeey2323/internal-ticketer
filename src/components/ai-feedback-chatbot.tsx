import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Loader2,
  Sparkles,
  User,
  Bot,
  X,
  CheckCircle,
  AlertCircle,
  Ticket,
  Star,
  Lightbulb,
  Target,
  ArrowRight,
  Calendar,
  Users,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { CATEGORIES, STUDIOS, TRAINERS } from "@/lib/constants";
import { ClassSelector, ClassSession } from "@/components/class-selector";
import { MomenceClientSearch } from "@/components/momence-client-search";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MomenceMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  pictureUrl?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  ticketCreated?: {
    ticketNumber: string;
    title: string;
    category: string;
    priority: string;
    studio: string;
  };
  currentQuestion?: ConversationQuestion;
  collectedData?: Partial<TicketData>;
  showClassSelector?: boolean;
  showMemberSelector?: boolean;
}

interface ConversationQuestion {
  id: string;
  question: string;
  type: "single-select" | "multi-select" | "text" | "confirm" | "class-select" | "member-select" | "multi-input";
  options?: { value: string; label: string; icon?: any; description?: string }[];
  field: keyof TicketData;
  required?: boolean;
  multiFields?: { field: keyof TicketData; label: string; placeholder: string }[];
}

interface TicketData {
  category: string;
  subcategory: string;
  studio: string;
  priority: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  trainerName: string;
  className: string;
  classDate: string;
  classId: string;
  feedbackType: string;
  sentiment: string;
  memberId: string;
  classDetails: ClassSession | null;
  memberDetails: MomenceMember | null;
}

interface AIFeedbackChatbotProps {
  onClose?: () => void;
  onAutoFill?: (data: any) => void;
  className?: string;
}

// Question flow for guided ticket creation
const CONVERSATION_FLOW: ConversationQuestion[] = [
  {
    id: "feedbackType",
    question: "What type of feedback would you like to submit?",
    type: "single-select",
    field: "feedbackType",
    required: true,
    options: [
      { value: "complaint", label: "Report an Issue", icon: AlertCircle, description: "Something went wrong" },
      { value: "trainer-feedback", label: "Trainer Feedback", icon: Star, description: "About an instructor" },
      { value: "suggestion", label: "Suggestion", icon: Lightbulb, description: "Improvement idea" },
      { value: "inquiry", label: "General Inquiry", icon: MessageCircle, description: "Question or help" },
    ],
  },
  {
    id: "category",
    question: "Which area does this relate to?",
    type: "single-select",
    field: "category",
    required: true,
    options: CATEGORIES.map(cat => ({
      value: cat.id,
      label: cat.name,
      description: cat.subcategories?.slice(0, 2).join(", ") || "",
    })),
  },
  {
    id: "class",
    question: "Select the class this is about (if applicable):",
    type: "class-select",
    field: "classDetails",
    required: false,
  },
  {
    id: "member",
    question: "Search and select the member involved:",
    type: "member-select",
    field: "memberDetails",
    required: false,
  },
  {
    id: "studio",
    question: "Which studio location is this about?",
    type: "single-select",
    field: "studio",
    required: true,
    options: STUDIOS.map(s => ({
      value: s.id,
      label: s.name,
      description: s.city,
    })),
  },
  {
    id: "priority",
    question: "How urgent is this?",
    type: "single-select",
    field: "priority",
    required: true,
    options: [
      { value: "critical", label: "Critical", description: "Needs immediate attention" },
      { value: "high", label: "High", description: "Important, resolve today" },
      { value: "medium", label: "Medium", description: "Normal priority" },
      { value: "low", label: "Low", description: "When time permits" },
    ],
  },
  {
    id: "description",
    question: "Please describe what happened in detail:",
    type: "text",
    field: "description",
    required: true,
  },
  {
    id: "confirm",
    question: "Ready to create this ticket?",
    type: "confirm",
    field: "title",
    options: [
      { value: "yes", label: "Create Ticket", description: "Submit now" },
      { value: "edit", label: "Start Over", description: "Make changes" },
    ],
  },
];

const TRAINER_QUESTIONS: ConversationQuestion[] = [
  {
    id: "trainerName",
    question: "Which trainer is this feedback about?",
    type: "single-select",
    field: "trainerName",
    required: true,
    options: TRAINERS.map(t => ({
      value: t.name,
      label: t.name,
      description: t.specialization,
    })),
  },
];

export function AIFeedbackChatbot({ onClose, onAutoFill, className }: AIFeedbackChatbotProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [collectedData, setCollectedData] = useState<Partial<TicketData>>({});
  const [questionFlow, setQuestionFlow] = useState<ConversationQuestion[]>([]);
  
  // Modal states for selectors
  const [showClassModal, setShowClassModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [selectedMember, setSelectedMember] = useState<MomenceMember | null>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI ticket assistant. Let's create a ticket together - just answer a few quick questions!",
      timestamp: new Date(),
      currentQuestion: CONVERSATION_FLOW[0],
    }]);
    setQuestionFlow(CONVERSATION_FLOW);
  }, []);

  // Build dynamic question flow based on feedback type
  const buildQuestionFlow = useCallback((feedbackType: string) => {
    let flow = [...CONVERSATION_FLOW];
    
    if (feedbackType === "trainer-feedback") {
      const categoryIndex = flow.findIndex(q => q.id === "category");
      flow.splice(categoryIndex + 1, 0, ...TRAINER_QUESTIONS);
    }
    
    return flow;
  }, []);

  // Handle option selection
  const handleOptionSelect = useCallback(async (value: string, question: ConversationQuestion) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.options?.find(o => o.value === value)?.label || value,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    const newData = { ...collectedData, [question.field]: value };
    setCollectedData(newData);

    if (question.id === "feedbackType") {
      const newFlow = buildQuestionFlow(value);
      setQuestionFlow(newFlow);
    }

    if (question.id === "confirm") {
      if (value === "yes") {
        await createTicket(newData);
        return;
      } else {
        setCurrentQuestionIndex(0);
        setCollectedData({});
        setSelectedClass(null);
        setSelectedMember(null);
        setMessages([{
          id: "restart",
          role: "assistant",
          content: "No problem! Let's start over.",
          timestamp: new Date(),
          currentQuestion: CONVERSATION_FLOW[0],
        }]);
        return;
      }
    }

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));

    const currentFlow = question.id === "feedbackType" ? buildQuestionFlow(value) : questionFlow;
    const currentIndex = currentFlow.findIndex(q => q.id === question.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex < currentFlow.length) {
      const nextQuestion = currentFlow[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      
      if (nextQuestion.id === "confirm") {
        const title = generateTitle(newData);
        newData.title = title;
        setCollectedData(newData);
      }

      const summaryContent = nextQuestion.id === "confirm" 
        ? buildSummaryMessage(newData, nextQuestion)
        : nextQuestion.question;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: summaryContent,
        timestamp: new Date(),
        currentQuestion: nextQuestion,
        collectedData: newData,
        showClassSelector: nextQuestion.type === "class-select",
        showMemberSelector: nextQuestion.type === "member-select",
      }]);
    }

    setIsLoading(false);
  }, [collectedData, questionFlow, buildQuestionFlow, isLoading]);

  // Build summary message for confirmation
  const buildSummaryMessage = (data: Partial<TicketData>, question: ConversationQuestion) => {
    const parts = ["Here's your ticket summary:\n"];
    
    parts.push(`📋 **${data.title || "New Ticket"}**`);
    parts.push(`🏷️ Priority: ${data.priority || "Medium"}`);
    parts.push(`📍 Studio: ${STUDIOS.find(s => s.id === data.studio)?.name || "Not specified"}`);
    
    if (data.classDetails) {
      parts.push(`📅 Class: ${(data.classDetails as ClassSession).name}`);
    }
    if (data.memberDetails) {
      const member = data.memberDetails as MomenceMember;
      parts.push(`👤 Member: ${member.firstName} ${member.lastName}`);
    }
    if (data.trainerName) {
      parts.push(`🎓 Trainer: ${data.trainerName}`);
    }
    
    parts.push(`\n${question.question}`);
    
    return parts.join("\n");
  };

  // Handle class selection
  const handleClassSelect = (session: ClassSession | null) => {
    setSelectedClass(session);
    if (session) {
      const newData = { 
        ...collectedData, 
        classDetails: session,
        className: session.name,
        classId: session.id.toString(),
        classDate: session.startsAt,
      };
      setCollectedData(newData);
      
      // Add user message showing selection
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        content: `Selected: ${session.name} on ${new Date(session.startsAt).toLocaleDateString()}`,
        timestamp: new Date(),
      }]);
      
      setShowClassModal(false);
      moveToNextQuestion(newData);
    }
  };

  // Handle member selection
  const handleMemberSelect = (member: MomenceMember | null) => {
    setSelectedMember(member);
    if (member) {
      const newData = { 
        ...collectedData, 
        memberDetails: member,
        customerId: member.id.toString(),
        customerName: `${member.firstName} ${member.lastName}`,
        customerEmail: member.email,
        customerPhone: member.phoneNumber,
      };
      setCollectedData(newData);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        content: `Selected: ${member.firstName} ${member.lastName}`,
        timestamp: new Date(),
      }]);
      
      setShowMemberModal(false);
      moveToNextQuestion(newData);
    }
  };

  // Skip selector questions
  const handleSkipSelector = (questionId: string) => {
    const currentIndex = questionFlow.findIndex(q => q.id === questionId);
    if (currentIndex >= 0 && currentIndex < questionFlow.length - 1) {
      const nextQuestion = questionFlow[currentIndex + 1];
      setCurrentQuestionIndex(currentIndex + 1);
      
      setMessages(prev => [...prev, 
        {
          id: Date.now().toString(),
          role: "user",
          content: "Skipped",
          timestamp: new Date(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: nextQuestion.question,
          timestamp: new Date(),
          currentQuestion: nextQuestion,
          showClassSelector: nextQuestion.type === "class-select",
          showMemberSelector: nextQuestion.type === "member-select",
        }
      ]);
    }
  };

  // Move to next question helper
  const moveToNextQuestion = async (newData: Partial<TicketData>) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questionFlow.length) {
      const nextQuestion = questionFlow[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      
      if (nextQuestion.id === "confirm") {
        const title = generateTitle(newData);
        newData.title = title;
        setCollectedData(newData);
      }

      const summaryContent = nextQuestion.id === "confirm" 
        ? buildSummaryMessage(newData, nextQuestion)
        : nextQuestion.question;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: summaryContent,
        timestamp: new Date(),
        currentQuestion: nextQuestion,
        collectedData: newData,
        showClassSelector: nextQuestion.type === "class-select",
        showMemberSelector: nextQuestion.type === "member-select",
      }]);
    }
    
    setIsLoading(false);
  };

  // Handle text input submission
  const handleTextSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const currentQuestion = questionFlow[currentQuestionIndex];
    if (!currentQuestion) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    const newData = { ...collectedData, [currentQuestion.field]: input.trim() };
    setCollectedData(newData);
    setInput("");

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questionFlow.length) {
      const nextQuestion = questionFlow[nextIndex];
      setCurrentQuestionIndex(nextIndex);

      if (nextQuestion.id === "confirm") {
        const title = generateTitle(newData);
        newData.title = title;
        setCollectedData(newData);
      }

      const summaryContent = nextQuestion.id === "confirm" 
        ? buildSummaryMessage(newData, nextQuestion)
        : nextQuestion.question;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: summaryContent,
        timestamp: new Date(),
        currentQuestion: nextQuestion,
        collectedData: newData,
        showClassSelector: nextQuestion.type === "class-select",
        showMemberSelector: nextQuestion.type === "member-select",
      }]);
    }

    setIsLoading(false);
  }, [input, currentQuestionIndex, questionFlow, collectedData, isLoading]);

  // Generate title from collected data
  const generateTitle = (data: Partial<TicketData>): string => {
    const feedbackType = data.feedbackType || "Issue";
    const category = CATEGORIES.find(c => c.id === data.category)?.name || "";
    const trainer = data.trainerName ? ` - ${data.trainerName}` : "";
    const studio = STUDIOS.find(s => s.id === data.studio)?.name || "";
    
    if (feedbackType === "trainer-feedback" && data.trainerName) {
      return `Trainer Feedback - ${data.trainerName} - ${studio}`;
    }
    
    return `${category}${trainer} - ${studio}`.trim() || "New Support Ticket";
  };

  // Create ticket
  const createTicket = async (data: Partial<TicketData>) => {
    setIsCreatingTicket(true);
    
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const ticketNumber = `TKT-${year}${month}${day}-${random}`;

      const categoryConfig = CATEGORIES.find(c => c.id === data.category);
      
      const { data: departments } = await supabase
        .from("departments")
        .select("id, name")
        .eq("isActive", true);
      
      const defaultDept = departments?.find(d => 
        d.name.toLowerCase().includes(categoryConfig?.defaultTeam?.toLowerCase() || "operations")
      );

      const { data: studios } = await supabase
        .from("studios")
        .select("id")
        .eq("code", data.studio)
        .maybeSingle();

      const studioId = studios?.id || (await supabase.from("studios").select("id").limit(1).single()).data?.id;

      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert([{
          ticketNumber,
          title: data.title || generateTitle(data),
          description: data.description || "",
          categoryId: data.category,
          studioId,
          priority: data.priority || "medium",
          status: "new",
          source: "ai-chatbot",
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          assignedDepartmentId: defaultDept?.id || null,
          reportedByUserId: user?.id,
          tags: [data.feedbackType, categoryConfig?.code].filter(Boolean),
          dynamicFieldData: {
            trainerName: data.trainerName,
            className: data.className,
            classDate: data.classDate,
            classId: data.classId,
            feedbackType: data.feedbackType,
            aiGenerated: true,
            memberId: (data.memberDetails as MomenceMember)?.id,
          },
        }])
        .select()
        .single();

      if (error) throw error;

      const studioName = STUDIOS.find(s => s.id === data.studio)?.name || "";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `✅ **Ticket Created Successfully!**\n\nYour ticket has been submitted and routed to the ${defaultDept?.name || "Operations"} team.\n\nIs there anything else I can help you with?`,
        timestamp: new Date(),
        ticketCreated: {
          ticketNumber,
          title: data.title || "",
          category: categoryConfig?.name || "",
          priority: data.priority || "medium",
          studio: studioName,
        },
      }]);

      toast({
        title: "Ticket Created",
        description: `${ticketNumber} has been created and assigned`,
      });

      setCurrentQuestionIndex(0);
      setCollectedData({});
      setSelectedClass(null);
      setSelectedMember(null);

    } catch (error: any) {
      console.error("Error creating ticket:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "❌ Sorry, I couldn't create the ticket. Please try again or use the manual form.",
        timestamp: new Date(),
      }]);
      
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Get current question type
  const currentQuestion = questionFlow[currentQuestionIndex];

  // Render option buttons with modern styling
  const renderOptions = (question: ConversationQuestion) => {
    if (!question.options) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-2 mt-4"
      >
        {question.options.map((option, idx) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleOptionSelect(option.value, question)}
              disabled={isLoading || isCreatingTicket}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all group",
                "hover:border-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-lg hover:scale-[1.02]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-card/80 backdrop-blur-sm border-border/50"
              )}
            >
              {Icon && (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{option.label}</p>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </motion.button>
          );
        })}
      </motion.div>
    );
  };

  // Render selector buttons for class/member
  const renderSelectorButtons = (message: Message) => {
    if (message.showClassSelector) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-2"
        >
          <Button 
            onClick={() => setShowClassModal(true)}
            className="w-full justify-start gap-3 h-12 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/20"
            variant="outline"
          >
            <Calendar className="h-5 w-5 text-primary" />
            <span>Select a Class</span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleSkipSelector("class")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Skip this step
          </Button>
        </motion.div>
      );
    }
    
    if (message.showMemberSelector) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-2"
        >
          <Button 
            onClick={() => setShowMemberModal(true)}
            className="w-full justify-start gap-3 h-12 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/20"
            variant="outline"
          >
            <Users className="h-5 w-5 text-primary" />
            <span>Search & Select Member</span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleSkipSelector("member")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Skip this step
          </Button>
        </motion.div>
      );
    }
    
    return null;
  };

  return (
    <>
      <Card className={cn(
        "flex flex-col h-[700px] max-h-[90vh] overflow-hidden",
        "bg-gradient-to-b from-background via-background to-muted/20",
        "border-2 border-primary/10 shadow-2xl shadow-primary/5",
        "rounded-3xl",
        className
      )}>
        {/* Modern Header */}
        <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-4">
              <motion.div 
                animate={{ 
                  boxShadow: ["0 0 20px rgba(139, 92, 246, 0.3)", "0 0 40px rgba(139, 92, 246, 0.5)", "0 0 20px rgba(139, 92, 246, 0.3)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center"
              >
                <Sparkles className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  AI Ticket Assistant
                </span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">Guided ticket creation</p>
              </div>
            </CardTitle>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="rounded-xl h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Messages Area with better scrolling */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-purple-500/20 shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                    message.role === "user"
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card/80 backdrop-blur-sm border border-border/50"
                  )}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    
                    {/* Ticket created card */}
                    {message.ticketCreated && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Ticket Created
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-bold text-lg">{message.ticketCreated.ticketNumber}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.ticketCreated.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {message.ticketCreated.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            📍 {message.ticketCreated.studio}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Render options or selector buttons */}
                    {message.currentQuestion && message.role === "assistant" && (
                      <>
                        {message.currentQuestion.type === "single-select" || message.currentQuestion.type === "confirm" ? (
                          renderOptions(message.currentQuestion)
                        ) : null}
                        {renderSelectorButtons(message)}
                      </>
                    )}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-9 w-9 shrink-0 shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {(isLoading || isCreatingTicket) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-purple-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-2 w-2 rounded-full bg-primary"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {isCreatingTicket ? "Creating ticket..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Modern Input Area */}
        <div className="p-4 border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent shrink-0">
          {currentQuestion?.type === "text" ? (
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                placeholder="Type your response..."
                disabled={isLoading || isCreatingTicket}
                className="rounded-xl h-12 bg-card/80 border-border/50 focus:border-primary"
              />
              <Button 
                onClick={handleTextSubmit}
                disabled={!input.trim() || isLoading || isCreatingTicket}
                className="rounded-xl h-12 px-5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {currentQuestion?.type === "class-select" || currentQuestion?.type === "member-select" 
                  ? "Use the button above to continue"
                  : "Select an option above to continue"
                }
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Class Selection Modal */}
      <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Select a Class
            </DialogTitle>
          </DialogHeader>
          <ClassSelector
            selectedClass={selectedClass}
            onClassSelect={handleClassSelect}
            label=""
            showBookingDetails={false}
          />
        </DialogContent>
      </Dialog>

      {/* Member Selection Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Search & Select Member
            </DialogTitle>
          </DialogHeader>
          <MomenceClientSearch
            selectedClient={selectedMember}
            onClientSelect={handleMemberSelect}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}