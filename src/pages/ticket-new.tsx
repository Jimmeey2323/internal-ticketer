import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  X,
  AlertCircle,
  Calendar,
  Clock,
  Plus,
  User,
  MapPin,
  FileText,
  Paperclip,
  Sparkles,
  Loader2,
  Check,
  Zap,
  Send,
  Building,
  Hash,
  UserCircle,
  Users,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Bot,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { MomenceClientSearch } from "@/components/momence-client-search";
import { ClassSelector, type ClassSession } from "@/components/class-selector";
import { AIFeedbackChatbot } from "@/components/ai-feedback-chatbot";
import { TICKET_TEMPLATES } from "@/components/ticket-templates";
import { TemplateGallery } from "@/components/premium-ticket-form/template-gallery";
import { FormStepIndicator } from "@/components/premium-ticket-form/form-step-indicator";
import { AIAssistantPanel } from "@/components/premium-ticket-form/ai-assistant-panel";
import { supabase } from "@/integrations/supabase/client";
import { PRIORITIES, CLIENT_MOODS, CLIENT_STATUSES, TRAINERS, CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Types from Supabase
interface Category {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  color: string | null;
  defaultPriority: string | null;
  slaHours: number | null;
}

interface Subcategory {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  defaultPriority: string | null;
}

interface DynamicField {
  id: string;
  uniqueId: string;
  label: string;
  fieldTypeId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  isRequired: boolean | null;
  isHidden: boolean | null;
  options: string[] | null;
  defaultValue: string | null;
  sortOrder: number | null;
  fieldType?: {
    name: string;
    inputComponent: string;
  };
}

interface Studio {
  id: string;
  name: string;
  code: string;
  address: any;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface UserRecord {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
}

// Form schema with conditional validation for optional modules
const ticketFormSchema = z.object({
  // Required fields
  description: z.string().min(10, "Description must be at least 10 characters"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  studioId: z.string().min(1, "Please select a location/studio"),
  categoryId: z.string().min(1, "Please select a category"),
  subcategoryId: z.string().optional(),
  priority: z.string().default("medium"),
  
  // Auto-populated but some editable
  assignedDepartmentId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  
  // Client details module
  includeClientDetails: z.boolean().default(false),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  customerMembershipId: z.string().optional(),
  customerStatus: z.string().optional(),
  clientMood: z.string().optional(),
  
  // Class details module
  includeClassDetails: z.boolean().default(false),
  className: z.string().optional(),
  classDateTime: z.string().optional(),
  
  // Trainer details module
  includeTrainerDetails: z.boolean().default(false),
  trainerName: z.string().optional(),
  trainerEmail: z.string().email().optional().or(z.literal("")),
  trainerPhone: z.string().optional(),
  
  // Additional
  incidentDateTime: z.string().optional(),
  internalNotes: z.string().optional(),
  source: z.string().optional(),
}).superRefine((data, ctx) => {
  // If client details module is included, require name and (email or phone)
  if (data.includeClientDetails) {
    if (!data.customerName || data.customerName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Client name is required when client details are added",
        path: ["customerName"],
      });
    }
    if ((!data.customerEmail || data.customerEmail.trim() === "") && 
        (!data.customerPhone || data.customerPhone.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either email or phone is required for client",
        path: ["customerEmail"],
      });
    }
  }
  
  // If trainer details module is included, require name and (email or phone)
  if (data.includeTrainerDetails) {
    if (!data.trainerName || data.trainerName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trainer name is required when trainer details are added",
        path: ["trainerName"],
      });
    }
    if ((!data.trainerEmail || data.trainerEmail.trim() === "") && 
        (!data.trainerPhone || data.trainerPhone.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either email or phone is required for trainer",
        path: ["trainerEmail"],
      });
    }
  }
  
  // If class details module is included, require class name
  if (data.includeClassDetails) {
    if (!data.className || data.className.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Class name is required when class details are added",
        path: ["className"],
      });
    }
  }
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

export default function NewTicket() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { user } = useAuth();
  const [ticketNumber, setTicketNumber] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [selectedMomenceClient, setSelectedMomenceClient] = useState<any>(null);
  const [selectedMomenceSession, setSelectedMomenceSession] = useState<ClassSession | null>(null);
  const [showAIChatbot, setShowAIChatbot] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Collapsible states
  const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
  const [classDetailsOpen, setClassDetailsOpen] = useState(false);
  const [trainerDetailsOpen, setTrainerDetailsOpen] = useState(false);

  // Parse URL params for template
  const templateId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('template');
  }, [searchString]);

  // Generate ticket number on mount
  useEffect(() => {
    const generateTicketNumber = () => {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `TKT-${year}${month}${day}-${random}`;
    };
    setTicketNumber(generateTicketNumber());
  }, []);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      description: "",
      title: "",
      studioId: "",
      categoryId: "",
      subcategoryId: "",
      priority: "medium",
      assignedDepartmentId: "_auto",
      assignedToUserId: "_auto",
      includeClientDetails: false,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerMembershipId: "",
      customerStatus: "",
      clientMood: "",
      includeClassDetails: false,
      className: "",
      classDateTime: "",
      includeTrainerDetails: false,
      trainerName: "",
      trainerEmail: "",
      trainerPhone: "",
      incidentDateTime: new Date().toISOString().slice(0, 16),
      internalNotes: "",
      source: "in-person",
    },
    mode: "onChange",
  });

  const selectedCategoryId = form.watch("categoryId");
  const selectedSubcategoryId = form.watch("subcategoryId");
  const description = form.watch("description");
  const includeClientDetails = form.watch("includeClientDetails");
  const includeClassDetails = form.watch("includeClassDetails");
  const includeTrainerDetails = form.watch("includeTrainerDetails");

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('isActive', true)
        .order('sortOrder')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch subcategories
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('categoryId', selectedCategoryId)
        .eq('isActive', true)
        .order('sortOrder')
        .order('name');
      if (error) throw error;
      return data as Subcategory[];
    },
    enabled: !!selectedCategoryId,
  });

  // Fetch dynamic fields
  const { data: dynamicFields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['dynamicFields', selectedCategoryId, selectedSubcategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      
      let query = supabase
        .from('dynamicFields')
        .select(`*, fieldType:fieldTypes(name, inputComponent)`)
        .eq('isActive', true)
        .eq('isHidden', false)
        .eq('categoryId', selectedCategoryId);
      
      // If subcategory is selected, filter by it; otherwise show category-level fields only
      if (selectedSubcategoryId) {
        query = query.eq('subcategoryId', selectedSubcategoryId);
      } else {
        query = query.is('subcategoryId', null);
      }
      
      const { data, error } = await query.order('sortOrder');
      if (error) throw error;
      return data as DynamicField[];
    },
    enabled: !!selectedCategoryId,
  });

  // Fetch studios
  const { data: studios = [], isLoading: studiosLoading } = useQuery({
    queryKey: ['studios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studios')
        .select('*')
        .eq('isActive', true)
        .order('name');
      if (error) throw error;
      return data as Studio[];
    },
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('isActive', true)
        .order('name');
      if (error) throw error;
      return data as Department[];
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, displayName, email, role')
        .eq('isActive', true)
        .order('displayName');
      if (error) throw error;
      return data as UserRecord[];
    },
  });

  // Reset subcategory when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      form.setValue('subcategoryId', '');
      const category = categories.find(c => c.id === selectedCategoryId);
      if (category?.defaultPriority) {
        form.setValue('priority', category.defaultPriority);
      }
    }
  }, [selectedCategoryId, categories, form]);

  // Sync collapsible state with form values
  useEffect(() => {
    form.setValue('includeClientDetails', clientDetailsOpen);
  }, [clientDetailsOpen, form]);

  useEffect(() => {
    form.setValue('includeClassDetails', classDetailsOpen);
  }, [classDetailsOpen, form]);

  useEffect(() => {
    form.setValue('includeTrainerDetails', trainerDetailsOpen);
  }, [trainerDetailsOpen, form]);

  // Template prefilling effect
  useEffect(() => {
    if (templateId && categories.length > 0) {
      const template = TICKET_TEMPLATES.find(t => t.id === templateId);
      if (template && !selectedTemplateId) {
        setSelectedTemplateId(templateId);
        
        // Find matching category by name
        const matchingCategory = categories.find(
          c => c.name.toLowerCase().includes(template.category.toLowerCase().split(' ')[0]) ||
               template.category.toLowerCase().includes(c.name.toLowerCase())
        );
        
        if (matchingCategory) {
          form.setValue('categoryId', matchingCategory.id);
        }
        
        // Set form values from template
        form.setValue('title', template.suggestedTitle);
        form.setValue('description', template.suggestedDescription);
        form.setValue('priority', template.priority);
        
        // Open relevant sections based on template
        if (template.category.includes('Customer') || template.category.includes('Service')) {
          setClientDetailsOpen(true);
        }
        if (template.suggestedDescription.toLowerCase().includes('class') || 
            template.suggestedDescription.toLowerCase().includes('trainer')) {
          setClassDetailsOpen(true);
          setTrainerDetailsOpen(true);
        }
        
        toast({
          title: "Template Applied",
          description: `Using "${template.name}" template. Please fill in the bracketed fields.`,
        });
      }
    }
  }, [templateId, categories, form, toast, selectedTemplateId]);

  // Generate AI title from description
  const generateTitle = useCallback(async () => {
    if (!description || description.length < 10) {
      toast({
        title: "Description too short",
        description: "Please enter at least 10 characters in the description to generate a title",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-ticket', {
        body: {
          description,
          action: 'generateTitle',
        }
      });

      if (error) throw error;
      
      if (data?.title) {
        form.setValue('title', data.title);
        toast({
          title: "Title generated",
          description: "AI has generated a title based on your description",
        });
      }
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback: create simple title from first sentence
      const firstSentence = description.split(/[.!?]/)[0].trim();
      const fallbackTitle = firstSentence.length > 50 
        ? firstSentence.substring(0, 47) + "..." 
        : firstSentence;
      form.setValue('title', fallbackTitle || "Customer Issue");
      toast({
        title: "Title generated",
        description: "Created title from description",
      });
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [description, form, toast]);

  const handleMomenceClientSelect = (client: any) => {
    setSelectedMomenceClient(client);
    if (client) {
      form.setValue("customerName", `${client.firstName || ''} ${client.lastName || ''}`.trim());
      form.setValue("customerEmail", client.email || "");
      form.setValue("customerPhone", client.phoneNumber || "");
      form.setValue("customerMembershipId", client.id ? String(client.id) : "");
      form.setValue("source", "momence");
    }
  };

  const handleMomenceSessionSelect = (session: ClassSession | null) => {
    setSelectedMomenceSession(session);
    if (session) {
      // Set class details
      form.setValue("className", session.name || "");
      
      // Set class date/time from session
      if (session.startsAt) {
        const sessionDate = new Date(session.startsAt);
        form.setValue("classDateTime", sessionDate.toISOString().slice(0, 16));
      }
      
      // Set trainer details from teacher
      if (session.teacher) {
        const trainerFullName = `${session.teacher.firstName || ''} ${session.teacher.lastName || ''}`.trim();
        form.setValue("trainerName", trainerFullName);
        
        // Open trainer section if we have trainer info
        if (trainerFullName) {
          setTrainerDetailsOpen(true);
        }
      }
      
      // Update source
      form.setValue("source", "momence");
      
      // Open class details section
      setClassDetailsOpen(true);
      
      toast({
        title: "Class Selected",
        description: `Class "${session.name}" details have been filled in.`,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TicketFormValues) => {
    try {
      setIsSubmitting(true);

      // Build dynamic field data
      const dynamicFieldData: Record<string, any> = {};
      dynamicFields.forEach((field) => {
        const value = (data as any)[field.uniqueId];
        if (value !== undefined && value !== "") {
          dynamicFieldData[field.uniqueId] = value;
        }
      });

      // Add optional module data
      if (data.includeClassDetails) {
        dynamicFieldData.className = data.className;
        dynamicFieldData.classDateTime = data.classDateTime;
      }
      if (data.includeTrainerDetails) {
        dynamicFieldData.trainerName = data.trainerName;
        dynamicFieldData.trainerEmail = data.trainerEmail;
        dynamicFieldData.trainerPhone = data.trainerPhone;
      }

      const category = categories.find(c => c.id === data.categoryId);
      const subcategory = subcategories.find(s => s.id === data.subcategoryId);

      // AI-powered routing analysis
      let aiRouting = null;
      try {
        const { data: routingData, error: routingError } = await supabase.functions.invoke('analyze-ticket', {
          body: {
            title: data.title,
            description: data.description,
            category: category?.name,
            subcategory: subcategory?.name,
            studioId: data.studioId,
          }
        });
        if (!routingError && routingData) {
          aiRouting = routingData;
          const priorityOrder = ['low', 'medium', 'high', 'critical'];
          if (aiRouting.priority && priorityOrder.indexOf(aiRouting.priority) > priorityOrder.indexOf(data.priority)) {
            data.priority = aiRouting.priority;
          }
        }
      } catch (aiError) {
        console.warn('AI routing failed:', aiError);
      }

      const ticketData = {
        ticketNumber,
        studioId: data.studioId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId || null,
        priority: data.priority,
        title: data.title,
        description: data.description,
        customerName: data.includeClientDetails ? data.customerName || null : null,
        customerEmail: data.includeClientDetails ? data.customerEmail || null : null,
        customerPhone: data.includeClientDetails ? data.customerPhone || null : null,
        customerMembershipId: data.includeClientDetails ? data.customerMembershipId || null : null,
        customerStatus: data.includeClientDetails ? data.customerStatus || null : null,
        clientMood: data.includeClientDetails ? data.clientMood || null : null,
        incidentDateTime: data.incidentDateTime ? new Date(data.incidentDateTime).toISOString() : null,
        internalNotes: data.internalNotes || null,
        assignedDepartmentId: data.assignedDepartmentId && data.assignedDepartmentId !== '_auto' ? data.assignedDepartmentId : null,
        assignedToUserId: data.assignedToUserId && data.assignedToUserId !== '_auto' ? data.assignedToUserId : null,
        reportedByUserId: user?.id || null,
        dynamicFieldData: {
          ...dynamicFieldData,
          aiRouting: aiRouting ? {
            department: aiRouting.department,
            suggestedTags: aiRouting.suggestedTags,
            needsEscalation: aiRouting.needsEscalation,
            routingConfidence: aiRouting.routingConfidence,
            analysis: aiRouting.analysis,
          } : null,
        },
        source: data.source || 'in-person',
        status: aiRouting?.needsEscalation ? 'escalated' : 'new',
        tags: aiRouting?.suggestedTags || [],
      };

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
        .single();

      if (error) throw error;

      // Get studio name for notifications
      const studioName = studios.find(s => s.id === data.studioId)?.name || '';

      // Send email notifications
      const notificationPromises: Promise<any>[] = [];

      // Notify assignee if assigned
      if (data.assignedToUserId && data.assignedToUserId !== '_auto') {
        const assignee = users.find(u => u.id === data.assignedToUserId);
        if (assignee?.email) {
          notificationPromises.push(
            supabase.functions.invoke('send-ticket-notification', {
              body: {
                type: 'assignment',
                ticketNumber,
                ticketTitle: data.title,
                recipientEmail: assignee.email,
                recipientName: assignee.displayName || assignee.email,
                studioName,
                priority: data.priority,
                category: category?.name,
                ticketUrl: `${window.location.origin}/tickets/${ticket.id}`,
              }
            }).catch(err => console.warn('Failed to send assignee notification:', err))
          );
        }
      }

      // Notify reporter
      if (user?.email) {
        notificationPromises.push(
          supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'status_change',
              ticketNumber,
              ticketTitle: data.title,
              recipientEmail: user.email,
              recipientName: user.firstName || user.email,
              oldStatus: 'Draft',
              newStatus: 'New',
              studioName,
              priority: data.priority,
              ticketUrl: `${window.location.origin}/tickets/${ticket.id}`,
            }
          }).catch(err => console.warn('Failed to send reporter notification:', err))
        );
      }

      // Notify customer if email provided
      if (data.includeClientDetails && data.customerEmail) {
        notificationPromises.push(
          supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'status_change',
              ticketNumber,
              ticketTitle: data.title,
              recipientEmail: data.customerEmail,
              recipientName: data.customerName || data.customerEmail,
              oldStatus: 'Submitted',
              newStatus: 'Received',
              studioName,
              priority: data.priority,
              ticketUrl: `${window.location.origin}/tickets/${ticket.id}`,
            }
          }).catch(err => console.warn('Failed to send customer notification:', err))
        );
      }

      // Send all notifications (don't block on them)
      if (notificationPromises.length > 0) {
        Promise.all(notificationPromises).catch(err => {
          console.warn('Some notifications failed:', err);
        });
      }

      toast({
        title: "Ticket created successfully",
        description: `Ticket ${ticketNumber} has been submitted. Notifications sent.`,
      });

      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate("/tickets");
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error creating ticket",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render dynamic field with enhanced styling
  const renderDynamicField = (field: DynamicField) => {
    const fieldTypeName = field.fieldType?.name || '';
    const inputComponent = field.fieldType?.inputComponent || 'Input';
    const fieldLabel = field.label || 'Field';

    return (
      <FormField
        key={field.uniqueId}
        control={form.control}
        name={field.uniqueId as any}
        render={({ field: formField }) => (
          <FormItem className="space-y-2">
            <FormLabel className="flex items-center gap-2 text-sm font-medium">
              {fieldLabel}
              {field.isRequired && <span className="text-destructive">*</span>}
            </FormLabel>
            <FormControl>
              {inputComponent === 'Select' || fieldTypeName === 'Dropdown' ? (
                <Select onValueChange={formField.onChange} value={(formField.value as string) || ''}>
                  <SelectTrigger className="rounded-xl bg-background/80 border-border/60 hover:border-primary/40 transition-colors">
                    <SelectValue placeholder={`Select ${fieldLabel.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {field.options?.filter(opt => opt && opt.trim() !== '').map((opt, idx) => (
                      <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : inputComponent === 'Textarea' || fieldTypeName === 'Long Text' ? (
                <Textarea
                  placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                  value={(formField.value as string) || ''}
                  onChange={formField.onChange}
                  className="rounded-xl bg-background/80 border-border/60 hover:border-primary/40 transition-colors min-h-24"
                />
              ) : inputComponent === 'Checkbox' || fieldTypeName === 'Checkbox' ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/40">
                  <Checkbox
                    id={field.uniqueId}
                    checked={formField.value === 'Yes' || formField.value === true}
                    onCheckedChange={(checked) => formField.onChange(checked ? 'Yes' : 'No')}
                    className="h-5 w-5"
                  />
                  <label htmlFor={field.uniqueId} className="text-sm text-foreground/80 cursor-pointer">
                    Yes
                  </label>
                </div>
              ) : (
                <Input
                  type={fieldTypeName === 'Email' ? 'email' : fieldTypeName === 'Phone' ? 'tel' : 'text'}
                  placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                  value={(formField.value as string) || ''}
                  onChange={formField.onChange}
                  className="rounded-xl bg-background/80 border-border/60 hover:border-primary/40 transition-colors"
                />
              )}
            </FormControl>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const currentDateTime = new Date().toLocaleString('en-IN', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tickets")}
            className="rounded-xl hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text-accent">Create New Ticket</h1>
                <p className="text-sm text-muted-foreground">
                  Log customer feedback or issues
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAIChatbot(true)}
            className="rounded-xl gap-2"
          >
            <Bot className="h-4 w-4" />
            AI Feedback Assistant
          </Button>
        </motion.div>

        {/* Template Applied Badge */}
        {selectedTemplateId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Template Applied: {TICKET_TEMPLATES.find(t => t.id === selectedTemplateId)?.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplateId(null);
                    form.reset();
                  }}
                  className="text-xs"
                >
                  Clear Template
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Description & Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span>Issue Description</span>
                  </CardTitle>
                  <CardDescription>
                    Describe the issue in detail. AI will help generate a title.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the issue in your own words... What happened? When did it occur? Any relevant details?"
                            className="min-h-32 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Brief summary of the issue"
                                className="rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateTitle}
                      disabled={isGeneratingTitle || description.length < 10}
                      className="rounded-xl"
                    >
                      {isGeneratingTitle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-2">Generate Title</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 2: Auto-populated & Editable Fields */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <Hash className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>Ticket Information</span>
                  </CardTitle>
                  <CardDescription>
                    Auto-generated fields. Department and Owner can be changed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Read-only auto-populated fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground">Ticket ID</span>
                      <p className="font-mono font-semibold text-sm">{ticketNumber}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Date & Time</span>
                      <p className="font-medium text-sm">{currentDateTime}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Reported By</span>
                      <p className="font-medium text-sm">{user?.email || 'Current User'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant="secondary" className="mt-1">New</Badge>
                    </div>
                  </div>

                  {/* Editable department and owner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="assignedDepartmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Department</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background">
                                <SelectValue placeholder="Auto-assign or select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border border-border z-50">
                              <SelectItem value="_auto">Auto-assign (AI routing)</SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Leave empty for AI-based routing
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedToUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To / Owner</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background">
                                <SelectValue placeholder="Auto-assign or select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border border-border z-50">
                              <SelectItem value="_auto">Auto-assign</SelectItem>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.displayName || u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Leave empty for auto-assignment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 3: Category, Subcategory, Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span>Classification & Location</span>
                  </CardTitle>
                  <CardDescription>Categorize and assign the ticket</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background">
                                <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select category"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border border-border z-50">
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <span className="flex items-center gap-2">
                                    <span 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: cat.color || '#3B82F6' }}
                                    />
                                    {cat.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedCategoryId && subcategories.length > 0 && (
                      <FormField
                        control={form.control}
                        name="subcategoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subcategory</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl bg-background">
                                  <SelectValue placeholder="Select subcategory" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-popover border border-border z-50">
                                {subcategories.map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="studioId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location / Studio *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background">
                                <SelectValue placeholder={studiosLoading ? "Loading..." : "Select location"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover border border-border z-50">
                              {studios.map((studio) => (
                                <SelectItem key={studio.id} value={studio.id}>
                                  <span className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    {studio.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Priority Selection */}
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 md:grid-cols-4 gap-3"
                          >
                            {Object.entries(PRIORITIES).map(([value, config]) => (
                              <label
                                key={value}
                                className={cn(
                                  "flex items-center justify-center p-3 rounded-xl cursor-pointer transition-all border-2",
                                  field.value === value
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/30"
                                )}
                              >
                                <RadioGroupItem value={value} className="sr-only" />
                                <span className={cn(
                                  "text-sm font-medium",
                                  field.value === value ? "text-primary" : "text-muted-foreground"
                                )}>
                                  {config.label}
                                </span>
                              </label>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 4: Dynamic Fields */}
            {selectedCategoryId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="glass-card border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <span>Additional Details</span>
                      {fieldsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </CardTitle>
                    <CardDescription>
                      {dynamicFields.length > 0 
                        ? "Category-specific fields to help resolve this ticket"
                        : subcategories.length > 0 && !selectedSubcategoryId
                          ? "Select a subcategory above to see additional fields"
                          : "No additional fields for this category"
                      }
                    </CardDescription>
                  </CardHeader>
                  {dynamicFields.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-muted/20 rounded-xl border border-border/50">
                        {dynamicFields.map(renderDynamicField)}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Section 5: Optional Modules */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Client Details Module */}
              <Collapsible open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
                <Card className="glass-card">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="h-5 w-5 text-primary" />
                          Client Details
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </CardTitle>
                        {clientDetailsOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {clientDetailsOpen && (
                        <CardDescription>
                          Name and (email or phone) are required when this section is added
                        </CardDescription>
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      <MomenceClientSearch
                        onClientSelect={handleMomenceClientSelect}
                        selectedClient={selectedMomenceClient}
                      />
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@example.com" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+91 XXXXX XXXXX" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerMembershipId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Membership ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Member ID" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-xl bg-background">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover border border-border z-50">
                                  {CLIENT_STATUSES.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientMood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Mood</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-xl bg-background">
                                    <SelectValue placeholder="How was the client feeling?" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover border border-border z-50">
                                  {CLIENT_MOODS.map((mood) => (
                                    <SelectItem key={mood.value} value={mood.value}>
                                      {mood.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Class Details Module */}
              <Collapsible open={classDetailsOpen} onOpenChange={setClassDetailsOpen}>
                <Card className="glass-card">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Calendar className="h-5 w-5 text-primary" />
                          Class Details
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </CardTitle>
                        {classDetailsOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {classDetailsOpen && (
                        <CardDescription>
                          Class name is required when this section is added
                        </CardDescription>
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      <ClassSelector
                        onClassSelect={handleMomenceSessionSelect}
                        selectedClass={selectedMomenceSession}
                        label="Select Class from Momence"
                        placeholder="Search: Class Name | Date | Time | Teacher"
                      />
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="className"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Class Name *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-xl bg-background">
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover border border-border z-50 max-h-60">
                                  {CLASSES.map((cls) => (
                                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="classDateTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Class Date & Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Trainer Details Module */}
              <Collapsible open={trainerDetailsOpen} onOpenChange={setTrainerDetailsOpen}>
                <Card className="glass-card">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Dumbbell className="h-5 w-5 text-primary" />
                          Trainer Details
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </CardTitle>
                        {trainerDetailsOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {trainerDetailsOpen && (
                        <CardDescription>
                          Name and (email or phone) are required when this section is added
                        </CardDescription>
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="trainerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trainer Name *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-xl bg-background">
                                    <SelectValue placeholder="Select trainer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover border border-border z-50 max-h-60">
                                  {TRAINERS.map((trainer) => (
                                    <SelectItem key={trainer.id} value={trainer.name}>
                                      {trainer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trainerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trainer Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="trainer@example.com" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trainerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trainer Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+91 XXXXX XXXXX" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>

            {/* Section 6: Additional Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Additional Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes for internal reference..."
                            className="min-h-20 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          These notes are visible only to staff, not customers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" className="rounded-xl" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          When did the incident actually occur?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 7: File Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-primary" />
                    File Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload or drag files here
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Max 5 files (Images, PDF, DOC)
                      </span>
                    </label>
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex justify-end gap-4 pt-4"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/tickets")}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>

      {/* AI Feedback Chatbot Dialog */}
      <Dialog open={showAIChatbot} onOpenChange={setShowAIChatbot}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>AI Feedback Assistant</DialogTitle>
          </DialogHeader>
          <AIFeedbackChatbot onClose={() => setShowAIChatbot(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
