import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  X,
  FileText,
  MessageSquare,
  CheckCircle,
  RefreshCw,
  History,
  Maximize2,
  Minimize2,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { TicketPreviewModal, type TicketPreviewData } from "@/components/ticket-preview-modal";
import { 
  detectPriority, 
  detectCategory, 
  requiresClassDetails as checkRequiresClassDetails,
  getDepartmentRouting,
  SLA_RULES
} from "@/lib/ticketRules";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasTicketData?: boolean;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: (ticketId: string, ticketNumber: string) => void;
  className?: string;
}

const CONVERSATION_STARTERS = [
  "A member complained about equipment during class",
  "Client couldn't find parking at the studio",
  "Trainer was late for the morning session",
  "App crashed when trying to book a class",
  "Member reported unfriendly staff behavior",
];

export function AIAssistantPanel({
  isOpen,
  onClose,
  onTicketCreated,
  className,
}: AIAssistantPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  
  // Ticket preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [ticketPreviewData, setTicketPreviewData] = useState<TicketPreviewData | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('isActive', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch subcategories
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('isActive', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch studios
  const { data: studios = [] } = useQuery({
    queryKey: ['studios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studios')
        .select('*')
        .eq('isActive', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('isActive', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('isActive', true)
        .order('displayName');
      if (error) throw error;
      return data;
    },
  });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "👋 Hi! I'm your AI Ticket Assistant. Simply describe the issue you want to report, and I'll:\n\n• Generate a professional title automatically\n• Determine the right category & priority\n• Auto-assign to the appropriate team & associate\n• Show you a full preview before creating\n\nJust describe what happened naturally!",
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length]);

  const generateTicketTitle = (description: string, categoryName: string): string => {
    // Extract key issue from description
    const lowerDesc = description.toLowerCase();
    
    // Common patterns
    if (lowerDesc.includes('complaint')) return `Customer Complaint - ${categoryName}`;
    if (lowerDesc.includes('trainer') && lowerDesc.includes('late')) return `Trainer Delayed for Scheduled Session`;
    if (lowerDesc.includes('equipment') && (lowerDesc.includes('broken') || lowerDesc.includes('issue'))) return `Equipment Issue Reported by Member`;
    if (lowerDesc.includes('app') && (lowerDesc.includes('crash') || lowerDesc.includes('error'))) return `App Technical Issue - User Report`;
    if (lowerDesc.includes('parking')) return `Parking/Access Issue at Studio`;
    if (lowerDesc.includes('rude') || lowerDesc.includes('unfriendly')) return `Staff Conduct Feedback - Member Report`;
    if (lowerDesc.includes('refund')) return `Refund Request - Member Account`;
    if (lowerDesc.includes('injury') || lowerDesc.includes('hurt')) return `Member Injury Report - Immediate Attention`;
    if (lowerDesc.includes('class') && lowerDesc.includes('cancel')) return `Class Cancellation Issue`;
    if (lowerDesc.includes('payment') || lowerDesc.includes('charge')) return `Billing/Payment Concern`;
    if (lowerDesc.includes('booking')) return `Booking System Issue`;
    
    // Default: Extract first meaningful phrase
    const words = description.split(' ').slice(0, 8).join(' ');
    return `${categoryName}: ${words}${description.length > 50 ? '...' : ''}`;
  };

  const analyzeAndExtractTicketData = async (userMessage: string): Promise<TicketPreviewData | null> => {
    try {
      // First try AI-based analysis
      let aiData: any = null;
      try {
        const { data, error } = await supabase.functions.invoke('analyze-ticket', {
          body: {
            action: 'fullAnalysis',
            description: userMessage,
            categories: categories.map(c => ({ id: c.id, name: c.name, code: c.code })),
            subcategories: subcategories.map(s => ({ id: s.id, name: s.name, categoryId: s.categoryId })),
            studios: studios.map(s => ({ id: s.id, name: s.name, code: s.code })),
            departments: departments.map(d => ({ id: d.id, name: d.name, code: d.code })),
            users: users.map(u => ({ id: u.id, name: u.displayName || u.email, departmentId: u.departmentId })),
          }
        });
        if (!error) aiData = data;
      } catch (e) {
        console.log('AI analysis fallback to rule-based');
      }

      // Use rules-based detection as primary/fallback
      const detectedPriority = aiData?.priority || detectPriority(userMessage);
      const detectedCategoryName = aiData?.category || detectCategory(userMessage);
      
      // Find matching category
      const category = categories.find(c => 
        c.name.toLowerCase().includes(detectedCategoryName.toLowerCase()) ||
        detectedCategoryName.toLowerCase().includes(c.name.toLowerCase())
      ) || categories[0];

      const subcategory = subcategories.find(s => 
        s.categoryId === category?.id &&
        (s.name.toLowerCase().includes((aiData?.subcategory || '').toLowerCase()) ||
        s.id === aiData?.subcategoryId)
      );

      // Detect studio from message or use first
      const studio = studios.find(s => 
        userMessage.toLowerCase().includes(s.name.toLowerCase())
      ) || studios[0];

      // Get department routing based on category
      const routing = getDepartmentRouting(category?.name || "Customer Service");
      const department = departments.find(d => 
        d.name.toLowerCase().includes(routing.primary.toLowerCase())
      ) || departments[0];

      // Find best user to assign based on department
      const assignee = department 
        ? users.find(u => u.departmentId === department.id) 
        : users[0];

      // Determine if class details are required
      const needsClassDetails = checkRequiresClassDetails(
        userMessage, 
        detectedPriority, 
        category?.name || "Customer Service"
      );

      // Generate title
      const title = aiData?.title || generateTicketTitle(userMessage, category?.name || "Customer Service");

      // Build AI reasoning
      const sla = SLA_RULES[detectedPriority as keyof typeof SLA_RULES] || SLA_RULES.medium;
      const aiReasoning = `Detected priority: ${detectedPriority.toUpperCase()} (${sla.description}). ` +
        `Routed to ${department?.name || routing.primary} based on category analysis. ` +
        (needsClassDetails ? 'Class details are required for this issue type.' : '');

      return {
        title,
        description: aiData?.improvedDescription || userMessage,
        categoryId: category?.id || '',
        categoryName: category?.name || 'General',
        subcategoryId: subcategory?.id,
        subcategoryName: subcategory?.name,
        studioId: studio?.id || '',
        studioName: studio?.name || 'Not specified',
        priority: detectedPriority,
        assignedDepartmentId: department?.id,
        departmentName: department?.name || routing.primary,
        assignedToUserId: assignee?.id,
        assigneeName: assignee?.displayName || assignee?.email || 'Auto-assign',
        customerName: aiData?.customerName || '',
        customerEmail: aiData?.customerEmail || '',
        customerPhone: aiData?.customerPhone || '',
        trainerName: aiData?.trainerName || '',
        className: aiData?.className || '',
        classDateTime: aiData?.classDateTime || '',
        tags: aiData?.suggestedTags || ['support', detectedPriority],
        requiresClassDetails: needsClassDetails,
        clientMood: aiData?.clientMood || 'neutral',
        source: 'ai-assistant',
        aiReasoning,
      };
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      
      // Complete fallback
      const category = categories[0];
      const studio = studios[0];
      const department = departments[0];
      
      return {
        title: generateTicketTitle(userMessage, category?.name || "Support"),
        description: userMessage,
        categoryId: category?.id || '',
        categoryName: category?.name || 'General',
        studioId: studio?.id || '',
        studioName: studio?.name || 'Not specified',
        priority: 'medium',
        departmentName: department?.name || 'Operations',
        assignedDepartmentId: department?.id,
        tags: ['support'],
        requiresClassDetails: false,
        source: 'ai-assistant',
      };
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Analyze the message and extract ticket data
      const ticketData = await analyzeAndExtractTicketData(userMessage);
      
      if (ticketData) {
        setTicketPreviewData(ticketData);
        
        // Create response message
        const responseContent = `✅ I've analyzed your issue and prepared a complete ticket:\n\n` +
          `**${ticketData.title}**\n\n` +
          `📂 Category: ${ticketData.categoryName}${ticketData.subcategoryName ? ` > ${ticketData.subcategoryName}` : ''}\n` +
          `📍 Location: ${ticketData.studioName}\n` +
          `⚡ Priority: ${ticketData.priority.toUpperCase()}\n` +
          `🏢 Department: ${ticketData.departmentName}\n` +
          `👤 Assignee: ${ticketData.assigneeName || 'Auto-assign'}\n\n` +
          (ticketData.requiresClassDetails 
            ? '⚠️ **Class details are required for this issue type.** Please fill them in the preview.\n\n' 
            : '') +
          `Click **"Review & Create"** to see the full preview and confirm.`;

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          hasTicketData: true,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error: any) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "❌ Sorry, I had trouble understanding that. Could you describe the issue in more detail?",
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketPreviewData) return;

    // Check if class details are required but not filled
    if (ticketPreviewData.requiresClassDetails && !ticketPreviewData.className) {
      toast({
        title: "Class Details Required",
        description: "Please fill in the class details for this type of issue.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTicket(true);

    try {
      // Generate ticket number
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const ticketNumber = `TKT-${year}${month}${day}-${random}`;

      // Create the ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([{
          ticketNumber,
          title: ticketPreviewData.title,
          description: ticketPreviewData.description,
          categoryId: ticketPreviewData.categoryId,
          subcategoryId: ticketPreviewData.subcategoryId || null,
          studioId: ticketPreviewData.studioId,
          priority: ticketPreviewData.priority,
          status: 'new',
          assignedDepartmentId: ticketPreviewData.assignedDepartmentId || null,
          assignedToUserId: ticketPreviewData.assignedToUserId || null,
          customerName: ticketPreviewData.customerName || null,
          customerEmail: ticketPreviewData.customerEmail || null,
          customerPhone: ticketPreviewData.customerPhone || null,
          clientMood: ticketPreviewData.clientMood || null,
          tags: ticketPreviewData.tags,
          source: 'ai-assistant',
          reportedByUserId: user?.id || null,
          dynamicFieldData: {
            trainerName: ticketPreviewData.trainerName,
            className: ticketPreviewData.className,
            classDateTime: ticketPreviewData.classDateTime,
            aiGenerated: true,
            aiReasoning: ticketPreviewData.aiReasoning,
          },
        }])
        .select()
        .single();

      if (error) throw error;

      // Close preview modal
      setShowPreviewModal(false);

      toast({
        title: "Ticket Created Successfully! 🎉",
        description: `Ticket ${ticketNumber} has been created and assigned.`,
      });

      // Add success message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `🎉 **Ticket Created Successfully!**\n\n` +
          `📋 Ticket Number: **${ticketNumber}**\n` +
          `📂 Assigned to: ${ticketPreviewData.departmentName}\n` +
          `👤 Assignee: ${ticketPreviewData.assigneeName || 'Pending assignment'}\n\n` +
          `The ticket is now in the system and will be handled according to its priority.`,
        timestamp: new Date(),
      }]);

      // Reset state
      setTicketPreviewData(null);
      
      // Notify parent
      onTicketCreated?.(ticket.id, ticketNumber);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error Creating Ticket",
        description: error.message || "Please try again or use the manual form.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const clearHistory = () => {
    setMessages([{
      id: "restart",
      role: "assistant",
      content: "🔄 Chat cleared! Ready to help with your ticket.",
      timestamp: new Date(),
    }]);
    setTicketPreviewData(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={cn(
            "fixed right-4 top-1/2 -translate-y-1/2 z-50",
            isExpanded ? "w-[600px] h-[85vh]" : "w-[480px] h-[700px]",
            "flex flex-col",
            "bg-background/95 backdrop-blur-xl",
            "border border-border/50 rounded-3xl",
            "shadow-2xl shadow-primary/10",
            "transition-all duration-300",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  boxShadow: isProcessing 
                    ? ["0 0 20px rgba(139, 92, 246, 0.3)", "0 0 40px rgba(139, 92, 246, 0.6)", "0 0 20px rgba(139, 92, 246, 0.3)"]
                    : "0 0 20px rgba(139, 92, 246, 0.3)"
                }}
                transition={{ duration: 1.5, repeat: isProcessing ? Infinity : 0 }}
                className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center"
              >
                <Ticket className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h3 className="font-bold text-sm">AI Ticket Assistant</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Natural language ticket creation
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? "Minimize" : "Expand"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 grid grid-cols-2 rounded-xl">
              <TabsTrigger value="chat" className="rounded-lg text-xs gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/80 border border-border/50"
                        )}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>

                          {/* Review & Create Button */}
                          {message.hasTicketData && ticketPreviewData && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                              <Button
                                size="sm"
                                onClick={() => setShowPreviewModal(true)}
                                className="rounded-lg text-xs h-9 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Review & Create
                              </Button>
                            </div>
                          )}
                        </div>

                        {message.role === "user" && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted/80 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="h-2 w-2 rounded-full bg-emerald-500"
                                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">Analyzing your issue...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Conversation Starters */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-muted-foreground mb-2">Try describing an issue:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONVERSATION_STARTERS.slice(0, 3).map((starter, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-full h-7"
                        onClick={() => {
                          setInput(starter);
                          inputRef.current?.focus();
                        }}
                      >
                        {starter.substring(0, 40)}...
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-border/50">
                <div className="flex gap-2">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe the issue you want to report..."
                    className="min-h-[44px] max-h-[120px] rounded-xl resize-none"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isProcessing}
                    className="rounded-xl h-11 w-11 shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Describe your issue naturally • AI will extract ticket details automatically
                </p>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-hidden m-0 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Recent conversations
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-xs h-7"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>

                <ScrollArea className="h-[calc(100%-60px)]">
                  <div className="space-y-2">
                    {messages
                      .filter(m => m.role === "user")
                      .reverse()
                      .slice(0, 10)
                      .map((message) => (
                        <Card key={message.id} className="bg-muted/30">
                          <CardContent className="p-3">
                            <p className="text-xs line-clamp-2">{message.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </AnimatePresence>

      {/* Ticket Preview Modal */}
      <TicketPreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        data={ticketPreviewData}
        onDataChange={setTicketPreviewData}
        onConfirm={handleCreateTicket}
        isSubmitting={isCreatingTicket}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        studios={studios.map(s => ({ id: s.id, name: s.name }))}
        departments={departments.map(d => ({ id: d.id, name: d.name }))}
        users={users.map(u => ({ id: u.id, displayName: u.displayName || undefined, email: u.email || undefined }))}
      />
    </>
  );
}
