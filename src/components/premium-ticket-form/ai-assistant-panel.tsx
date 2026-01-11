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
  Edit3,
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
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { TicketPreviewModal, type TicketPreviewData } from "@/components/ticket-preview-modal";
import { requiresClassDetails } from "@/lib/ticketRules";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  ticketData?: ExtractedTicketData;
}

interface ExtractedTicketData {
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  studioId: string;
  studioName: string;
  priority: string;
  assignedDepartmentId?: string;
  departmentName?: string;
  assignedToUserId?: string;
  assigneeName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  trainerName?: string;
  className?: string;
  classDateTime?: string;
  tags: string[];
  requiresClassDetails: boolean;
  clientMood?: string;
  source: string;
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
  const [activeTab, setActiveTab] = useState<"chat" | "preview" | "history">("chat");
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTicketData | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [classDetailsExpanded, setClassDetailsExpanded] = useState(false);
  const [clientDetailsExpanded, setClientDetailsExpanded] = useState(false);

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
        content: "👋 Hi! I'm your AI Ticket Assistant. Simply describe the issue you want to report, and I'll:\n\n• Generate a professional title\n• Determine the right category & priority\n• Auto-assign to the appropriate team\n• Create a complete ticket for you\n\nJust describe what happened naturally!",
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length]);

  const analyzeAndExtractTicketData = async (userMessage: string): Promise<ExtractedTicketData | null> => {
    try {
      // Call AI to analyze the message
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

      if (error) throw error;

      // Map AI response to ticket data
      const category = categories.find(c => 
        c.name.toLowerCase().includes((data.category || '').toLowerCase()) ||
        c.id === data.categoryId
      ) || categories[0];

      const subcategory = subcategories.find(s => 
        s.categoryId === category?.id &&
        (s.name.toLowerCase().includes((data.subcategory || '').toLowerCase()) ||
        s.id === data.subcategoryId)
      );

      const studio = studios.find(s => 
        s.name.toLowerCase().includes((data.studio || data.location || '').toLowerCase()) ||
        s.id === data.studioId
      ) || studios[0];

      const department = departments.find(d => 
        d.name.toLowerCase().includes((data.department || '').toLowerCase()) ||
        d.id === data.departmentId
      );

      // Find best user to assign based on department
      const assignee = department 
        ? users.find(u => u.departmentId === department.id) 
        : users[0];

      // Determine if class details are required
      const requiresClassDetails = 
        (data.priority === 'critical' || data.priority === 'high') ||
        category?.name?.toLowerCase().includes('customer') ||
        category?.name?.toLowerCase().includes('service') ||
        userMessage.toLowerCase().includes('class') ||
        userMessage.toLowerCase().includes('trainer') ||
        userMessage.toLowerCase().includes('instructor');

      return {
        title: data.title || `Issue Report - ${new Date().toLocaleDateString()}`,
        description: data.improvedDescription || userMessage,
        categoryId: category?.id || '',
        categoryName: category?.name || 'General',
        subcategoryId: subcategory?.id,
        subcategoryName: subcategory?.name,
        studioId: studio?.id || '',
        studioName: studio?.name || 'Not specified',
        priority: data.priority || 'medium',
        assignedDepartmentId: department?.id,
        departmentName: department?.name || data.department || 'Operations',
        assignedToUserId: assignee?.id,
        assigneeName: assignee?.displayName || assignee?.email || 'Auto-assign',
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        customerPhone: data.customerPhone || '',
        trainerName: data.trainerName || '',
        className: data.className || '',
        classDateTime: data.classDateTime || '',
        tags: data.suggestedTags || ['support'],
        requiresClassDetails,
        clientMood: data.clientMood || 'calm',
        source: 'ai-assistant',
      };
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      
      // Fallback extraction
      const category = categories[0];
      const studio = studios[0];
      
      return {
        title: userMessage.substring(0, 60),
        description: userMessage,
        categoryId: category?.id || '',
        categoryName: category?.name || 'General',
        studioId: studio?.id || '',
        studioName: studio?.name || 'Not specified',
        priority: 'medium',
        departmentName: 'Operations',
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
        setExtractedData(ticketData);
        
        // Create response message
        const responseContent = `✅ I've analyzed your issue and prepared a ticket:\n\n**${ticketData.title}**\n\n📂 Category: ${ticketData.categoryName}${ticketData.subcategoryName ? ` > ${ticketData.subcategoryName}` : ''}\n📍 Location: ${ticketData.studioName}\n⚡ Priority: ${ticketData.priority.toUpperCase()}\n🏢 Department: ${ticketData.departmentName}\n👤 Assignee: ${ticketData.assigneeName || 'Auto-assign'}\n\n${ticketData.requiresClassDetails ? '⚠️ **Class details are recommended for this issue type.**\n\n' : ''}Click "Preview & Create" to review all details before submitting.`;

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          ticketData,
        };
        setMessages(prev => [...prev, assistantMsg]);
        
        // If class details are required, expand that section
        if (ticketData.requiresClassDetails) {
          setClassDetailsExpanded(true);
        }
        
        // Switch to preview tab
        setActiveTab("preview");
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
    if (!extractedData) return;

    // Check if class details are required but not filled
    if (extractedData.requiresClassDetails && !extractedData.className) {
      toast({
        title: "Class Details Required",
        description: "Please fill in the class details for this type of issue.",
        variant: "destructive",
      });
      setClassDetailsExpanded(true);
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
          title: extractedData.title,
          description: extractedData.description,
          categoryId: extractedData.categoryId,
          subcategoryId: extractedData.subcategoryId || null,
          studioId: extractedData.studioId,
          priority: extractedData.priority,
          status: 'new',
          assignedDepartmentId: extractedData.assignedDepartmentId || null,
          assignedToUserId: extractedData.assignedToUserId || null,
          customerName: extractedData.customerName || null,
          customerEmail: extractedData.customerEmail || null,
          customerPhone: extractedData.customerPhone || null,
          clientMood: extractedData.clientMood || null,
          tags: extractedData.tags,
          source: 'ai-assistant',
          reportedByUserId: user?.id || null,
          dynamicFieldData: {
            trainerName: extractedData.trainerName,
            className: extractedData.className,
            classDateTime: extractedData.classDateTime,
            aiGenerated: true,
          },
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Ticket Created Successfully! 🎉",
        description: `Ticket ${ticketNumber} has been created and assigned.`,
      });

      // Add success message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `🎉 **Ticket Created Successfully!**\n\n📋 Ticket Number: **${ticketNumber}**\n📂 Assigned to: ${extractedData.departmentName}\n👤 Assignee: ${extractedData.assigneeName || 'Pending assignment'}\n\nThe ticket is now in the system and will be handled according to its priority.`,
        timestamp: new Date(),
      }]);

      // Reset state
      setExtractedData(null);
      setActiveTab("chat");
      
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

  const updateExtractedData = (field: string, value: any) => {
    if (!extractedData) return;
    
    setExtractedData(prev => {
      if (!prev) return prev;
      
      // Handle special cases for linked fields
      if (field === 'categoryId') {
        const category = categories.find(c => c.id === value);
        return { ...prev, categoryId: value, categoryName: category?.name || prev.categoryName };
      }
      if (field === 'studioId') {
        const studio = studios.find(s => s.id === value);
        return { ...prev, studioId: value, studioName: studio?.name || prev.studioName };
      }
      if (field === 'assignedDepartmentId') {
        const dept = departments.find(d => d.id === value);
        return { ...prev, assignedDepartmentId: value, departmentName: dept?.name || prev.departmentName };
      }
      if (field === 'assignedToUserId') {
        const user = users.find(u => u.id === value);
        return { ...prev, assignedToUserId: value, assigneeName: user?.displayName || user?.email || prev.assigneeName };
      }
      
      return { ...prev, [field]: value };
    });
    setEditingField(null);
  };

  const clearHistory = () => {
    setMessages([{
      id: "restart",
      role: "assistant",
      content: "🔄 Chat cleared! Ready to help with your ticket.",
      timestamp: new Date(),
    }]);
    setExtractedData(null);
    setActiveTab("chat");
  };

  if (!isOpen) return null;

  return (
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
          <TabsList className="mx-4 mt-3 grid grid-cols-3 rounded-xl">
            <TabsTrigger value="chat" className="rounded-lg text-xs gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="preview" className="rounded-lg text-xs gap-1.5" disabled={!extractedData}>
              <FileText className="h-3.5 w-3.5" />
              Preview
              {extractedData && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
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

                        {/* Ticket Preview Button */}
                        {message.ticketData && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                            <Button
                              size="sm"
                              onClick={() => setActiveTab("preview")}
                              className="rounded-lg text-xs h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Preview & Create
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingField("title");
                                setActiveTab("preview");
                              }}
                              className="rounded-lg text-xs h-8"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
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

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 flex flex-col overflow-hidden m-0">
            {extractedData ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground">TITLE</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => setEditingField(editingField === 'title' ? null : 'title')}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      {editingField === 'title' ? (
                        <Input
                          value={extractedData.title}
                          onChange={(e) => updateExtractedData('title', e.target.value)}
                          className="rounded-xl"
                          autoFocus
                          onBlur={() => setEditingField(null)}
                        />
                      ) : (
                        <p className="text-base font-semibold">{extractedData.title}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground">DESCRIPTION</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => setEditingField(editingField === 'description' ? null : 'description')}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      {editingField === 'description' ? (
                        <Textarea
                          value={extractedData.description}
                          onChange={(e) => updateExtractedData('description', e.target.value)}
                          className="rounded-xl min-h-[80px]"
                          autoFocus
                          onBlur={() => setEditingField(null)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{extractedData.description}</p>
                      )}
                    </div>

                    {/* Quick Fields Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Category */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Category
                        </Label>
                        <Select
                          value={extractedData.categoryId}
                          onValueChange={(v) => updateExtractedData('categoryId', v)}
                        >
                          <SelectTrigger className="rounded-xl h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Studio */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Location
                        </Label>
                        <Select
                          value={extractedData.studioId}
                          onValueChange={(v) => updateExtractedData('studioId', v)}
                        >
                          <SelectTrigger className="rounded-xl h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {studios.map(studio => (
                              <SelectItem key={studio.id} value={studio.id}>{studio.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Priority (AI Determined)
                        </Label>
                        <Select
                          value={extractedData.priority}
                          onValueChange={(v) => updateExtractedData('priority', v)}
                        >
                          <SelectTrigger className="rounded-xl h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITIES).map(([key, val]) => (
                              <SelectItem key={key} value={key}>{val.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Department (AI Assigned)
                        </Label>
                        <Select
                          value={extractedData.assignedDepartmentId || ''}
                          onValueChange={(v) => updateExtractedData('assignedDepartmentId', v)}
                        >
                          <SelectTrigger className="rounded-xl h-9 text-xs">
                            <SelectValue placeholder={extractedData.departmentName} />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Assignee */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        Assigned To (AI Determined)
                      </Label>
                      <Select
                        value={extractedData.assignedToUserId || ''}
                        onValueChange={(v) => updateExtractedData('assignedToUserId', v)}
                      >
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue placeholder={extractedData.assigneeName || 'Auto-assign'} />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.displayName || u.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {extractedData.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Class Details Section */}
                    <Collapsible open={classDetailsExpanded} onOpenChange={setClassDetailsExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between rounded-xl h-10">
                          <span className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            Class Details
                            {extractedData.requiresClassDetails && (
                              <Badge variant="destructive" className="text-[10px] h-5">Required</Badge>
                            )}
                          </span>
                          {classDetailsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Class Name</Label>
                            <Select
                              value={extractedData.className || ''}
                              onValueChange={(v) => updateExtractedData('className', v)}
                            >
                              <SelectTrigger className="rounded-xl h-9 text-xs">
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                {CLASSES.map(cls => (
                                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Class Date/Time</Label>
                            <Input
                              type="datetime-local"
                              value={extractedData.classDateTime || ''}
                              onChange={(e) => updateExtractedData('classDateTime', e.target.value)}
                              className="rounded-xl h-9 text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Trainer</Label>
                          <Select
                            value={extractedData.trainerName || ''}
                            onValueChange={(v) => updateExtractedData('trainerName', v)}
                          >
                            <SelectTrigger className="rounded-xl h-9 text-xs">
                              <SelectValue placeholder="Select trainer" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRAINERS.map(trainer => (
                                <SelectItem key={trainer.id} value={trainer.name}>{trainer.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Client Details Section */}
                    <Collapsible open={clientDetailsExpanded} onOpenChange={setClientDetailsExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between rounded-xl h-10">
                          <span className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            Client Details
                          </span>
                          {clientDetailsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Client Name</Label>
                          <Input
                            value={extractedData.customerName || ''}
                            onChange={(e) => updateExtractedData('customerName', e.target.value)}
                            placeholder="Enter client name"
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Email</Label>
                            <Input
                              type="email"
                              value={extractedData.customerEmail || ''}
                              onChange={(e) => updateExtractedData('customerEmail', e.target.value)}
                              placeholder="client@email.com"
                              className="rounded-xl h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Phone</Label>
                            <Input
                              type="tel"
                              value={extractedData.customerPhone || ''}
                              onChange={(e) => updateExtractedData('customerPhone', e.target.value)}
                              placeholder="+91..."
                              className="rounded-xl h-9 text-xs"
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </ScrollArea>

                {/* Create Button */}
                <div className="p-4 border-t border-border/50 space-y-2">
                  <Button
                    onClick={handleCreateTicket}
                    disabled={isCreatingTicket}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-base font-semibold"
                  >
                    {isCreatingTicket ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Creating Ticket...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Create Ticket
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("chat")}
                    className="w-full rounded-xl"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Revise Description
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No ticket to preview yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Describe an issue in the chat to generate a ticket.</p>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-xl"
                    onClick={() => setActiveTab("chat")}
                  >
                    Go to Chat
                  </Button>
                </div>
              </div>
            )}
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
  );
}
