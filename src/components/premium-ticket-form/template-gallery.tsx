import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Check,
  Clock,
  AlertTriangle,
  Bookmark,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TICKET_TEMPLATES, type TicketTemplate } from "@/components/ticket-templates";

interface TemplateGalleryProps {
  onSelectTemplate: (template: TicketTemplate) => void;
  selectedTemplateId?: string | null;
  className?: string;
}

const PRIORITY_COLORS = {
  critical: "from-red-500 to-rose-600",
  high: "from-orange-500 to-amber-600",
  medium: "from-blue-500 to-indigo-600",
  low: "from-emerald-500 to-teal-600",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "All Templates" },
  { value: "Booking & Technology", label: "Booking & Tech" },
  { value: "Customer Service", label: "Customer Service" },
  { value: "Health & Safety", label: "Health & Safety" },
  { value: "Sales & Marketing", label: "Sales" },
  { value: "Special Programs", label: "Special Programs" },
  { value: "Retail Management", label: "Retail" },
];

export function TemplateGallery({ 
  onSelectTemplate, 
  selectedTemplateId,
  className 
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [favoriteTemplates, setFavoriteTemplates] = useState<Set<string>>(new Set());

  const filteredTemplates = useMemo(() => {
    return TICKET_TEMPLATES.filter(template => {
      const matchesSearch = searchQuery === "" || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === "all" || 
        template.category === categoryFilter;
      
      const matchesPriority = !priorityFilter || 
        template.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [searchQuery, categoryFilter, priorityFilter]);

  const toggleFavorite = (templateId: string) => {
    setFavoriteTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const sortedTemplates = useMemo(() => {
    const favorites = filteredTemplates.filter(t => favoriteTemplates.has(t.id));
    const nonFavorites = filteredTemplates.filter(t => !favoriteTemplates.has(t.id));
    return [...favorites, ...nonFavorites];
  }, [filteredTemplates, favoriteTemplates]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Template Gallery</h3>
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} templates available
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="rounded-xl"
          >
            {viewMode === "grid" ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid3X3 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-border/50 bg-background/80"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {["critical", "high", "medium", "low"].map(priority => (
          <Button
            key={priority}
            variant={priorityFilter === priority ? "default" : "outline"}
            size="sm"
            onClick={() => setPriorityFilter(priorityFilter === priority ? null : priority)}
            className={cn(
              "rounded-full text-xs capitalize",
              priorityFilter === priority && "shadow-md"
            )}
          >
            {priority === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
            {priority}
          </Button>
        ))}
        {(priorityFilter || categoryFilter !== "all" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPriorityFilter(null);
              setCategoryFilter("all");
              setSearchQuery("");
            }}
            className="rounded-full text-xs text-muted-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Templates Grid/List */}
      <ScrollArea className="h-[500px] pr-3">
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-3"
        )}>
          <AnimatePresence mode="popLayout">
            {sortedTemplates.map((template, index) => {
              const Icon = template.icon;
              const isSelected = selectedTemplateId === template.id;
              const isExpanded = expandedTemplate === template.id;
              const isFavorite = favoriteTemplates.has(template.id);

              if (viewMode === "list") {
                return (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-lg",
                      "border-border/50 hover:border-primary/30",
                      isSelected && "ring-2 ring-primary border-primary/50 bg-primary/5"
                    )}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                          "bg-gradient-to-br shadow-lg",
                          template.color
                        )}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{template.name}</h4>
                            {isFavorite && (
                              <Bookmark className="h-3 w-3 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge 
                            variant={template.priority === "critical" ? "destructive" : "secondary"}
                            className="text-xs capitalize"
                          >
                            {template.priority}
                          </Badge>
                          {template.slaHours && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {template.slaHours}h
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(template.id);
                            }}
                          >
                            <Bookmark className={cn(
                              "h-4 w-4",
                              isFavorite && "fill-amber-400 text-amber-400"
                            )} />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onSelectTemplate(template)}
                            className="rounded-lg"
                          >
                            {isSelected ? <Check className="h-4 w-4" /> : "Use"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "group relative rounded-2xl overflow-hidden",
                    "border border-border/50 hover:border-primary/30",
                    "bg-card/50 backdrop-blur-sm",
                    "transition-all duration-300 hover:shadow-xl hover:shadow-primary/5",
                    isSelected && "ring-2 ring-primary border-primary/50 bg-primary/5"
                  )}
                >
                  {/* Gradient Background */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity",
                    "bg-gradient-to-br",
                    template.color
                  )} />

                  <div className="relative p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        "bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform",
                        template.color
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toggleFavorite(template.id)}
                      >
                        <Bookmark className={cn(
                          "h-4 w-4 transition-colors",
                          isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                        )} />
                      </Button>
                    </div>

                    {/* Content */}
                    <div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                        {template.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        className={cn(
                          "text-xs capitalize text-white border-0",
                          `bg-gradient-to-r ${PRIORITY_COLORS[template.priority as keyof typeof PRIORITY_COLORS]}`
                        )}
                      >
                        {template.priority}
                      </Badge>
                      {template.slaHours && (
                        <Badge variant="outline" className="text-xs bg-background/50">
                          <Clock className="h-3 w-3 mr-1" />
                          {template.slaHours}h SLA
                        </Badge>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="text-[10px] bg-muted/50"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Expand Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                    >
                      {isExpanded ? "Hide details" : "Show details"}
                      <ChevronRight className={cn(
                        "h-3 w-3 ml-1 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </Button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t border-border/50"
                        >
                          {template.quickTips && (
                            <div>
                              <p className="text-[10px] font-semibold text-foreground mb-1">💡 Quick Tips</p>
                              <ul className="space-y-0.5">
                                {template.quickTips.slice(0, 3).map((tip, i) => (
                                  <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                                    <span>•</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {template.requiredFields && (
                            <div>
                              <p className="text-[10px] font-semibold text-foreground mb-1">✅ Required</p>
                              <div className="flex flex-wrap gap-1">
                                {template.requiredFields.slice(0, 4).map((field, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px]">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Button */}
                    <Button
                      className={cn(
                        "w-full rounded-xl transition-all",
                        isSelected && "bg-primary"
                      )}
                      onClick={() => onSelectTemplate(template)}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Use Template
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-semibold mb-1">No templates found</h4>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
