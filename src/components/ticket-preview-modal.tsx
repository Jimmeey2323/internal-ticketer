import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Edit3,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Building2,
  UserCheck,
  Calendar,
  Users,
  Tag,
  Clock,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PRIORITIES, TRAINERS, CLASSES, CLIENT_MOODS } from "@/lib/constants";
import { SLA_RULES } from "@/lib/ticketRules";

export interface TicketPreviewData {
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
  clientMood?: string;
  trainerName?: string;
  className?: string;
  classDateTime?: string;
  tags: string[];
  requiresClassDetails: boolean;
  source: string;
  aiReasoning?: string;
}

interface TicketPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TicketPreviewData | null;
  onDataChange: (data: TicketPreviewData) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  categories: Array<{ id: string; name: string }>;
  studios: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; displayName?: string; email?: string }>;
}

export function TicketPreviewModal({
  open,
  onOpenChange,
  data,
  onDataChange,
  onConfirm,
  isSubmitting = false,
  categories,
  studios,
  departments,
  users,
}: TicketPreviewModalProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [classDetailsOpen, setClassDetailsOpen] = useState(data?.requiresClassDetails || false);
  const [clientDetailsOpen, setClientDetailsOpen] = useState(!!data?.customerName);
  const [newTag, setNewTag] = useState("");

  if (!data) return null;

  const updateField = (field: keyof TicketPreviewData, value: any) => {
    const updated = { ...data, [field]: value };
    
    // Update linked display names
    if (field === 'categoryId') {
      const cat = categories.find(c => c.id === value);
      updated.categoryName = cat?.name || data.categoryName;
    }
    if (field === 'studioId') {
      const studio = studios.find(s => s.id === value);
      updated.studioName = studio?.name || data.studioName;
    }
    if (field === 'assignedDepartmentId') {
      const dept = departments.find(d => d.id === value);
      updated.departmentName = dept?.name || data.departmentName;
    }
    if (field === 'assignedToUserId') {
      const user = users.find(u => u.id === value);
      updated.assigneeName = user?.displayName || user?.email || data.assigneeName;
    }
    
    onDataChange(updated);
    setEditingField(null);
  };

  const addTag = () => {
    if (newTag.trim() && !data.tags.includes(newTag.trim())) {
      updateField('tags', [...data.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    updateField('tags', data.tags.filter(t => t !== tag));
  };

  const sla = SLA_RULES[data.priority as keyof typeof SLA_RULES] || SLA_RULES.medium;
  const priorityConfig = PRIORITIES[data.priority as keyof typeof PRIORITIES] || PRIORITIES.medium;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Review & Create Ticket
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI has pre-filled this ticket. Review and edit any field before creating.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-220px)] px-6">
          <div className="space-y-6 py-4">
            {/* AI Reasoning Banner */}
            {data.aiReasoning && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">AI Analysis</p>
                      <p className="text-sm text-muted-foreground mt-1">{data.aiReasoning}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Ticket Title
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setEditingField(editingField === 'title' ? null : 'title')}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
              {editingField === 'title' ? (
                <Input
                  value={data.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="rounded-xl font-medium"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                />
              ) : (
                <p className="text-lg font-semibold bg-muted/30 rounded-xl p-3">{data.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Description</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setEditingField(editingField === 'description' ? null : 'description')}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
              {editingField === 'description' ? (
                <Textarea
                  value={data.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="rounded-xl min-h-[100px]"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 whitespace-pre-wrap">
                  {data.description}
                </p>
              )}
            </div>

            <Separator />

            {/* Core Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Category
                </Label>
                <Select
                  value={data.categoryId}
                  onValueChange={(v) => updateField('categoryId', v)}
                >
                  <SelectTrigger className="rounded-xl">
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
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </Label>
                <Select
                  value={data.studioId}
                  onValueChange={(v) => updateField('studioId', v)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {studios.map(studio => (
                      <SelectItem key={studio.id} value={studio.id}>{studio.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority - AI Determined */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Priority
                  <Badge variant="secondary" className="text-[10px]">AI Determined</Badge>
                </Label>
                <Select
                  value={data.priority}
                  onValueChange={(v) => updateField('priority', v)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITIES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {val.label}
                          <span className="text-xs text-muted-foreground">
                            (SLA: {SLA_RULES[key as keyof typeof SLA_RULES]?.resolutionHours}h)
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Response within {sla.responseMinutes} min, Resolution within {sla.resolutionHours}h
                </p>
              </div>

              {/* Department - AI Assigned */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Department
                  <Badge variant="secondary" className="text-[10px]">AI Assigned</Badge>
                </Label>
                <Select
                  value={data.assignedDepartmentId || ''}
                  onValueChange={(v) => updateField('assignedDepartmentId', v)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={data.departmentName || 'Select department'} />
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
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                Assigned To
                <Badge variant="secondary" className="text-[10px]">AI Determined</Badge>
              </Label>
              <Select
                value={data.assignedToUserId || ''}
                onValueChange={(v) => updateField('assignedToUserId', v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={data.assigneeName || 'Auto-assign on creation'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-assign</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.displayName || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive/20"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="h-7 w-24 text-xs rounded-lg"
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={addTag}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Class Details Section */}
            <Collapsible open={classDetailsOpen} onOpenChange={setClassDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-xl h-12 hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Class Details
                    {data.requiresClassDetails && (
                      <Badge variant="destructive" className="text-[10px]">Required</Badge>
                    )}
                  </span>
                  {classDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Class Name</Label>
                    <Select
                      value={data.className || ''}
                      onValueChange={(v) => updateField('className', v)}
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
                    <Label className="text-sm">Class Date/Time</Label>
                    <Input
                      type="datetime-local"
                      value={data.classDateTime || ''}
                      onChange={(e) => updateField('classDateTime', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Trainer</Label>
                  <Select
                    value={data.trainerName || ''}
                    onValueChange={(v) => updateField('trainerName', v)}
                  >
                    <SelectTrigger className="rounded-xl">
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
            <Collapsible open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-xl h-12 hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Client Details
                  </span>
                  {clientDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Client Name</Label>
                  <Input
                    value={data.customerName || ''}
                    onChange={(e) => updateField('customerName', e.target.value)}
                    placeholder="Enter client name"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Email</Label>
                    <Input
                      type="email"
                      value={data.customerEmail || ''}
                      onChange={(e) => updateField('customerEmail', e.target.value)}
                      placeholder="client@email.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Phone</Label>
                    <Input
                      type="tel"
                      value={data.customerPhone || ''}
                      onChange={(e) => updateField('customerPhone', e.target.value)}
                      placeholder="+91..."
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Client Mood</Label>
                  <Select
                    value={data.clientMood || ''}
                    onValueChange={(v) => updateField('clientMood', v)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_MOODS.map(mood => (
                        <SelectItem key={mood.value} value={mood.value}>{mood.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting || (data.requiresClassDetails && !data.className)}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Create Ticket
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
