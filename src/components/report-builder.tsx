import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Plus, 
  Play, 
  Download, 
  Calendar,
  BarChart3,
  PieChart,
  Table,
  TrendingUp,
  Target,
  Users,
  AlertCircle,
  Loader2,
  Eye,
  Clock,
  Share2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  reportType: string;
  filters: Record<string, any>;
  columns: string[];
  groupBy: string | null;
  sortBy: string | null;
  sortOrder: string;
  chartType: string | null;
  schedule: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  recipients: string[];
  createdBy: string;
  isPublic: boolean;
  sharedWith: string[];
  createdAt: string;
}

const REPORT_TYPES = [
  { value: "custom", label: "Custom Report", icon: FileText, description: "Build your own report" },
  { value: "sla_compliance", label: "SLA Compliance", icon: Target, description: "SLA performance metrics" },
  { value: "team_performance", label: "Team Performance", icon: Users, description: "Team productivity analysis" },
  { value: "escalation", label: "Escalation Analysis", icon: AlertCircle, description: "Escalation patterns and trends" },
  { value: "trend", label: "Trend Analysis", icon: TrendingUp, description: "Historical ticket trends" },
];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: TrendingUp },
  { value: "pie", label: "Pie Chart", icon: PieChart },
  { value: "table", label: "Data Table", icon: Table },
];

const AVAILABLE_COLUMNS = [
  { value: "ticketNumber", label: "Ticket Number" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "category", label: "Category" },
  { value: "studio", label: "Studio" },
  { value: "assignedTo", label: "Assigned To" },
  { value: "createdAt", label: "Created Date" },
  { value: "resolvedAt", label: "Resolved Date" },
  { value: "resolutionTime", label: "Resolution Time" },
  { value: "slaStatus", label: "SLA Status" },
  { value: "customerSatisfaction", label: "CSAT Rating" },
];

const GROUP_BY_OPTIONS = [
  { value: "", label: "No grouping" },
  { value: "category", label: "Category" },
  { value: "studio", label: "Studio" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "assignedTo", label: "Assigned User" },
  { value: "team", label: "Team" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export function ReportBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canManageReports, isLoading: roleLoading } = useUserRole();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    reportType: "custom",
    columns: ["ticketNumber", "title", "status", "priority", "createdAt"],
    groupBy: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    chartType: "table",
    dateRange: "30d",
    categoryFilter: "",
    studioFilter: "",
    statusFilter: "",
    isPublic: false,
  });

  // Fetch saved reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["saved-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savedReports")
        .select("*")
        .order("createdAt", { ascending: false });
      
      if (error) throw error;
      return data as SavedReport[];
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

  // Fetch studios
  const { data: studios = [] } = useQuery({
    queryKey: ["studios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("id, name")
        .eq("isActive", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Save report mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SavedReport>) => {
      if (selectedReport) {
        const { error } = await supabase
          .from("savedReports")
          .update(data)
          .eq("id", selectedReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("savedReports")
          .insert({
            ...data,
            createdBy: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      toast({
        title: selectedReport ? "Report Updated" : "Report Saved",
        description: `Report has been ${selectedReport ? "updated" : "saved"} successfully.`,
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

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("savedReports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      toast({
        title: "Report Deleted",
        description: "Report has been deleted.",
      });
    },
  });

  const handleOpenDialog = (report?: SavedReport) => {
    if (report) {
      setSelectedReport(report);
      setFormData({
        name: report.name,
        description: report.description || "",
        reportType: report.reportType,
        columns: report.columns || [],
        groupBy: report.groupBy || "",
        sortBy: report.sortBy || "createdAt",
        sortOrder: report.sortOrder || "desc",
        chartType: report.chartType || "table",
        dateRange: (report.filters as any)?.dateRange || "30d",
        categoryFilter: (report.filters as any)?.categoryId || "",
        studioFilter: (report.filters as any)?.studioId || "",
        statusFilter: (report.filters as any)?.status || "",
        isPublic: report.isPublic,
      });
    } else {
      setSelectedReport(null);
      setFormData({
        name: "",
        description: "",
        reportType: "custom",
        columns: ["ticketNumber", "title", "status", "priority", "createdAt"],
        groupBy: "",
        sortBy: "createdAt",
        sortOrder: "desc",
        chartType: "table",
        dateRange: "30d",
        categoryFilter: "",
        studioFilter: "",
        statusFilter: "",
        isPublic: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedReport(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Report name is required.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      reportType: formData.reportType,
      filters: {
        dateRange: formData.dateRange,
        categoryId: formData.categoryFilter || null,
        studioId: formData.studioFilter || null,
        status: formData.statusFilter || null,
      },
      columns: formData.columns,
      groupBy: formData.groupBy || null,
      sortBy: formData.sortBy,
      sortOrder: formData.sortOrder,
      chartType: formData.chartType,
      isPublic: formData.isPublic,
    });
  };

  const handleGenerateReport = async (report: SavedReport) => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Report Generated",
        description: `"${report.name}" has been generated successfully.`,
      });
      
      // Update lastRunAt
      await supabase
        .from("savedReports")
        .update({ lastRunAt: new Date().toISOString() })
        .eq("id", report.id);
      
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleColumn = (column: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.includes(column)
        ? prev.columns.filter(c => c !== column)
        : [...prev.columns, column],
    }));
  };

  const getReportTypeIcon = (type: string) => {
    const reportType = REPORT_TYPES.find(t => t.value === type);
    return reportType?.icon || FileText;
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Report Builder</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage custom reports and analytics
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedReport ? "Edit Report" : "Create New Report"}
              </DialogTitle>
              <DialogDescription>
                Configure your custom report settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Report Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekly SLA Report"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((type) => (
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this report shows..."
                  rows={2}
                />
              </div>

              {/* Filters */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Filters</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select
                      value={formData.dateRange}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, dateRange: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="12m">Last 12 months</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.categoryFilter}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, categoryFilter: value }))}
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
                    <Label>Studio</Label>
                    <Select
                      value={formData.studioFilter}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, studioFilter: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All studios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All studios</SelectItem>
                        {studios.map((studio) => (
                          <SelectItem key={studio.id} value={studio.id}>{studio.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Columns Selection */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Select Columns</h4>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_COLUMNS.map((col) => (
                    <div key={col.value} className="flex items-center gap-2">
                      <Checkbox
                        id={col.value}
                        checked={formData.columns.includes(col.value)}
                        onCheckedChange={() => toggleColumn(col.value)}
                      />
                      <Label htmlFor={col.value} className="text-sm cursor-pointer">
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grouping & Sorting */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Group By</Label>
                  <Select
                    value={formData.groupBy}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, groupBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_BY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select
                    value={formData.sortBy}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_COLUMNS.map((col) => (
                        <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <Select
                    value={formData.chartType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, chartType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((type) => (
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
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Public Report</Label>
                  <p className="text-xs text-muted-foreground">Allow all team members to view this report</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedReport ? "Update Report" : "Save Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Report Templates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REPORT_TYPES.slice(1).map((type) => (
          <Card 
            key={type.value}
            className="glass-card cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => {
              setFormData(prev => ({ ...prev, reportType: type.value, name: type.label }));
              setIsDialogOpen(true);
            }}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <type.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium text-sm">{type.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved Reports */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Saved Reports</CardTitle>
          <CardDescription>Your custom and saved reports</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No saved reports yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {reports.map((report) => {
                  const ReportIcon = getReportTypeIcon(report.reportType);
                  return (
                    <div 
                      key={report.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ReportIcon className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{report.name}</h4>
                          {report.isPublic && (
                            <Badge variant="outline" className="text-xs">
                              <Share2 className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">{report.reportType.replace("_", " ")}</span>
                          {report.lastRunAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last run: {format(new Date(report.lastRunAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReport(report)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Run
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageReports && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
