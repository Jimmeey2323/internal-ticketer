import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  AlertCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  Zap, 
  Clock, 
  ArrowUpRight,
  Bell,
  Users,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EscalationRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerValue: number | null;
  categoryId: string | null;
  studioId: string | null;
  priority: string | null;
  escalateTo: string | null;
  escalateToTeamId: string | null;
  escalateToDepartmentId: string | null;
  notifyRoles: string[];
  changePriority: string | null;
  sendNotification: boolean;
  notificationTemplate: string | null;
  runOrder: number;
  isActive: boolean;
}

const TRIGGER_TYPES = [
  { value: "sla_breach", label: "SLA Breach", icon: AlertCircle, description: "When ticket breaches SLA" },
  { value: "time_elapsed", label: "Time Elapsed", icon: Clock, description: "After specified hours without resolution" },
  { value: "priority_change", label: "Priority Change", icon: ArrowUpRight, description: "When priority is upgraded" },
  { value: "no_response", label: "No Response", icon: Clock, description: "No first response within threshold" },
  { value: "customer_request", label: "Customer Request", icon: Users, description: "Customer explicitly requests escalation" },
];

const PRIORITIES = ["low", "medium", "high", "critical"];

export function EscalationRulesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdminOrManager, isLoading: roleLoading } = useUserRole();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerType: "sla_breach",
    triggerValue: 4,
    categoryId: "",
    studioId: "",
    priority: "",
    escalateTo: "",
    escalateToTeamId: "",
    escalateToDepartmentId: "",
    notifyRoles: [] as string[],
    changePriority: "",
    sendNotification: true,
    notificationTemplate: "",
    runOrder: 0,
    isActive: true,
  });

  // Fetch rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["escalation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalationRules")
        .select("*")
        .order("runOrder", { ascending: true });
      
      if (error) throw error;
      return data as EscalationRule[];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("isActive", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("isActive", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("isActive", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<EscalationRule>) => {
      if (editingRule) {
        const { error } = await supabase
          .from("escalationRules")
          .update(data)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("escalationRules")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-rules"] });
      toast({
        title: editingRule ? "Rule Updated" : "Rule Created",
        description: `Escalation rule has been ${editingRule ? "updated" : "created"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("escalationRules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-rules"] });
      toast({
        title: "Rule Deleted",
        description: "Escalation rule has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("escalationRules")
        .update({ isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-rules"] });
    },
  });

  const handleOpenDialog = (rule?: EscalationRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || "",
        triggerType: rule.triggerType,
        triggerValue: rule.triggerValue || 4,
        categoryId: rule.categoryId || "",
        studioId: rule.studioId || "",
        priority: rule.priority || "",
        escalateTo: rule.escalateTo || "",
        escalateToTeamId: rule.escalateToTeamId || "",
        escalateToDepartmentId: rule.escalateToDepartmentId || "",
        notifyRoles: rule.notifyRoles || [],
        changePriority: rule.changePriority || "",
        sendNotification: rule.sendNotification,
        notificationTemplate: rule.notificationTemplate || "",
        runOrder: rule.runOrder,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: "",
        description: "",
        triggerType: "sla_breach",
        triggerValue: 4,
        categoryId: "",
        studioId: "",
        priority: "",
        escalateTo: "",
        escalateToTeamId: "",
        escalateToDepartmentId: "",
        notifyRoles: [],
        changePriority: "",
        sendNotification: true,
        notificationTemplate: "",
        runOrder: rules.length,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRule(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      triggerType: formData.triggerType,
      triggerValue: formData.triggerValue,
      categoryId: formData.categoryId || null,
      studioId: formData.studioId || null,
      priority: formData.priority || null,
      escalateTo: formData.escalateTo || null,
      escalateToTeamId: formData.escalateToTeamId || null,
      escalateToDepartmentId: formData.escalateToDepartmentId || null,
      notifyRoles: formData.notifyRoles,
      changePriority: formData.changePriority || null,
      sendNotification: formData.sendNotification,
      notificationTemplate: formData.notificationTemplate || null,
      runOrder: formData.runOrder,
      isActive: formData.isActive,
    });
  };

  const getTriggerIcon = (type: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    return trigger?.icon || AlertCircle;
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdminOrManager) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            Only administrators and managers can manage escalation rules.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Escalation Rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure automatic and manual escalation workflows
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Escalation Rule" : "Create Escalation Rule"}
              </DialogTitle>
              <DialogDescription>
                Configure when and how tickets should be escalated
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Critical SLA Breach"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="runOrder">Run Order</Label>
                  <Input
                    id="runOrder"
                    type="number"
                    value={formData.runOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, runOrder: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this rule applies..."
                  rows={2}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Trigger Conditions
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select
                      value={formData.triggerType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, triggerType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Threshold (hours)</Label>
                    <Input
                      type="number"
                      value={formData.triggerValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, triggerValue: parseInt(e.target.value) || 0 }))}
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category Filter</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priority Filter</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All priorities</SelectItem>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  Escalation Actions
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Escalate to Team</Label>
                    <Select
                      value={formData.escalateToTeamId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, escalateToTeamId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No team change</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Escalate to Department</Label>
                    <Select
                      value={formData.escalateToDepartmentId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, escalateToDepartmentId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No department change</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upgrade Priority To</Label>
                  <Select
                    value={formData.changePriority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, changePriority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Keep current priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keep current priority</SelectItem>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Notifications
                </h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Send Notification</Label>
                    <p className="text-xs text-muted-foreground">Notify relevant parties on escalation</p>
                  </div>
                  <Switch
                    checked={formData.sendNotification}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendNotification: checked }))}
                  />
                </div>

                {formData.sendNotification && (
                  <div className="space-y-2">
                    <Label>Notification Template</Label>
                    <Textarea
                      value={formData.notificationTemplate}
                      onChange={(e) => setFormData(prev => ({ ...prev, notificationTemplate: e.target.value }))}
                      placeholder="Custom notification message (optional)..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Enable this escalation rule</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Escalation Rules</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first escalation rule to automate ticket escalations.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {rules.map((rule) => {
              const TriggerIcon = getTriggerIcon(rule.triggerType);
              return (
                <Card key={rule.id} className={cn("glass-card", !rule.isActive && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        rule.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <TriggerIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Order: {rule.runOrder}
                          </Badge>
                        </div>
                        
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {TRIGGER_TYPES.find(t => t.value === rule.triggerType)?.label || rule.triggerType}
                          </Badge>
                          {rule.triggerValue && (
                            <Badge variant="outline" className="text-xs">
                              {rule.triggerValue}h threshold
                            </Badge>
                          )}
                          {rule.changePriority && (
                            <Badge variant="outline" className="text-xs capitalize">
                              → {rule.changePriority} priority
                            </Badge>
                          )}
                          {rule.sendNotification && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="h-3 w-3 mr-1" />
                              Notify
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: rule.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Escalation Rule</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{rule.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(rule.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
