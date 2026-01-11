import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, Clock, X, Search, ChevronDown, MapPin, Plus, Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface SessionBooking {
  id: number;
  createdAt: string;
  checkedIn: boolean;
  cancelledAt?: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    pictureUrl?: string;
  };
}

export interface ClassSession {
  id: number;
  name: string;
  type?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  durationInMinutes: number;
  capacity: number;
  bookingCount?: number;
  waitlistBookingCount?: number;
  waitlistCapacity?: number;
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
    pictureUrl?: string;
  };
  isRecurring?: boolean;
  isCancelled?: boolean;
  isInPerson?: boolean;
  isDraft?: boolean;
  inPersonLocation?: {
    id: number;
    name: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    badgeColor?: string;
  }>;
  displayLabel?: string;
  // Booking metrics
  bookings?: SessionBooking[];
  checkedInCount?: number;
  cancelledCount?: number;
}

interface ClassSelectorProps {
  onClassSelect: (session: ClassSession | null, bookings?: SessionBooking[]) => void;
  selectedClass: ClassSession | null;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  onMultipleSelect?: (sessions: ClassSession[]) => void;
  selectedClasses?: ClassSession[];
  showBookingDetails?: boolean;
}

const formatClassLabel = (session: ClassSession): string => {
  const date = format(new Date(session.startsAt), "MMM d, yyyy");
  const time = format(new Date(session.startsAt), "h:mm a");
  const teacherName = session.teacher?.firstName 
    ? `${session.teacher.firstName} ${session.teacher.lastName || ''}`.trim() 
    : "No Teacher";
  
  return `${session.name} | ${date} | ${time} | ${teacherName}`;
};

export function ClassSelector({ 
  onClassSelect, 
  selectedClass,
  label = "Select Class",
  placeholder = "Search and select a class...",
  multiple = false,
  onMultipleSelect,
  selectedClasses = [],
  showBookingDetails = true
}: ClassSelectorProps) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [bookings, setBookings] = useState<SessionBooking[]>([]);
  const [showAttendees, setShowAttendees] = useState(false);
  const { toast } = useToast();

  const loadSessions = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("momence-api", {
        body: { action: "getSessions", pageSize: 200 },
      });

      if (error) throw error;
      
      const validSessions = (data?.payload || [])
        .filter((s: any) => s && !s.isCancelled && !s.isDraft && s.startsAt)
        .map((s: any) => {
          // Safely extract teacher info handling nested/malformed data
          const teacher = s.teacher && typeof s.teacher === 'object' && s.teacher.firstName
            ? {
                id: s.teacher.id,
                firstName: s.teacher.firstName || '',
                lastName: s.teacher.lastName || '',
                pictureUrl: s.teacher.pictureUrl
              }
            : undefined;
          
          return {
            ...s,
            teacher,
            displayLabel: formatClassLabel({ ...s, teacher })
          } as ClassSession;
        });
      
      setSessions(validSessions);
      setFilteredSessions(validSessions);
      setHasLoadedOnce(true);
      console.log("ClassSelector: Loaded", validSessions.length, "sessions");
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Failed to Load Classes",
        description: "Could not load class sessions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isLoading]);

  const loadSessionBookings = useCallback(async (sessionId: number) => {
    setIsLoadingBookings(true);
    try {
      const { data, error } = await supabase.functions.invoke("momence-api", {
        body: { action: "getSessionBookings", sessionId, pageSize: 100 },
      });

      if (error) throw error;
      
      const raw = Array.isArray(data?.payload) ? data.payload : [];
      const bookingData: SessionBooking[] = raw
        .filter(Boolean)
        .map((b: any) => {
          const customer = b?.customer && typeof b.customer === "object" ? b.customer : undefined;
          return {
            ...b,
            customer: customer
              ? {
                  id: customer.id,
                  firstName: customer.firstName || "",
                  lastName: customer.lastName || "",
                  email: customer.email,
                  phoneNumber: customer.phoneNumber,
                  pictureUrl: customer.pictureUrl,
                }
              : {
                  id: 0,
                  firstName: "Unknown",
                  lastName: "",
                },
          } as SessionBooking;
        });

      setBookings(bookingData);
      setShowAttendees(true);

      const checkedInCount = bookingData.filter((b) => Boolean(b?.checkedIn)).length;
      const cancelledCount = bookingData.filter((b) => Boolean(b?.cancelledAt)).length;

      return { bookings: bookingData, checkedInCount, cancelledCount };
      console.error("Error loading session bookings:", error);
      toast({
        title: "Failed to Load Bookings",
        description: "Could not load session attendees.",
        variant: "destructive",
      });
      return { bookings: [], checkedInCount: 0, cancelledCount: 0 };
    } finally {
      setIsLoadingBookings(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen && !hasLoadedOnce) {
      loadSessions();
    }
  }, [isOpen, hasLoadedOnce, loadSessions]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSessions(
        sessions.filter((s) =>
          s.name?.toLowerCase().includes(query) ||
          s.teacher?.firstName?.toLowerCase().includes(query) ||
          s.teacher?.lastName?.toLowerCase().includes(query) ||
          s.inPersonLocation?.name?.toLowerCase().includes(query) ||
          s.displayLabel?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, sessions]);

  const handleSelectSession = async (session: ClassSession) => {
    if (multiple && onMultipleSelect) {
      const isAlreadySelected = selectedClasses.some(s => s.id === session.id);
      if (isAlreadySelected) {
        onMultipleSelect(selectedClasses.filter(s => s.id !== session.id));
      } else {
        onMultipleSelect([...selectedClasses, session]);
      }
    } else {
      // Load bookings for the selected session
      if (showBookingDetails) {
        const bookingData = await loadSessionBookings(session.id);
        const enrichedSession: ClassSession = {
          ...session,
          bookings: bookingData.bookings,
          checkedInCount: bookingData.checkedInCount,
          cancelledCount: bookingData.cancelledCount,
        };
        onClassSelect(enrichedSession, bookingData.bookings);
      } else {
        onClassSelect(session);
      }
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleClearSession = () => {
    onClassSelect(null);
    setBookings([]);
    setShowAttendees(false);
  };

  const isSessionSelected = (sessionId: number) => {
    if (multiple) {
      return selectedClasses.some(s => s.id === sessionId);
    }
    return selectedClass?.id === sessionId;
  };

  const removeFromMultiple = (sessionId: number) => {
    if (onMultipleSelect) {
      onMultipleSelect(selectedClasses.filter(s => s.id !== sessionId));
    }
  };

  // Calculate metrics
  const checkedInCount = bookings.filter(b => b.checkedIn).length;
  const cancelledCount = bookings.filter(b => b.cancelledAt).length;
  const activeBookings = bookings.filter(b => !b.cancelledAt);

  // Multiple selection display
  if (multiple && selectedClasses.length > 0) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{label} ({selectedClasses.length} selected)</Label>
        <div className="space-y-2">
          {selectedClasses.map((session) => (
            <Card key={session.id} className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(session.startsAt), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.startsAt), "h:mm a")}
                      </span>
                      {session.teacher && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {session.teacher.firstName} {session.teacher.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFromMultiple(session.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add More Classes
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[450px] p-0 bg-popover border border-border shadow-lg z-50" align="start">
            <SessionSearchContent
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isLoading={isLoading}
              filteredSessions={filteredSessions}
              handleSelectSession={handleSelectSession}
              isSessionSelected={isSessionSelected}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Single selection with selected class display
  if (!multiple && selectedClass) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{label}</Label>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-lg">{selectedClass.name}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(selectedClass.startsAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(selectedClass.startsAt), "h:mm a")} ({selectedClass.durationInMinutes} mins)</span>
                  </div>
                  {selectedClass.teacher && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{selectedClass.teacher.firstName} {selectedClass.teacher.lastName}</span>
                    </div>
                  )}
                  {selectedClass.inPersonLocation && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedClass.inPersonLocation.name}</span>
                    </div>
                  )}
                </div>

                {/* Class Metrics */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {selectedClass.bookingCount || 0}/{selectedClass.capacity} Booked
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {checkedInCount} Checked In
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                    <XCircle className="h-3 w-3" />
                    {cancelledCount} Cancelled
                  </Badge>
                  {selectedClass.waitlistBookingCount !== undefined && selectedClass.waitlistBookingCount > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      Waitlist: {selectedClass.waitlistBookingCount}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearSession}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {selectedClass.tags && selectedClass.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {selectedClass.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ backgroundColor: tag.badgeColor || undefined }}
                    className="text-xs"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Attendees List */}
            {showBookingDetails && bookings.length > 0 && (
              <Collapsible open={showAttendees} onOpenChange={setShowAttendees} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Attendees ({activeBookings.length})
                    </span>
                    {isLoadingBookings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAttendees ? 'rotate-180' : ''}`} />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <ScrollArea className="h-[200px] rounded-md border">
                    <div className="p-2 space-y-1">
                      {activeBookings.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          {booking.customer?.pictureUrl ? (
                            <img
                              src={booking.customer.pictureUrl}
                              alt={`${booking.customer?.firstName || "Attendee"} ${booking.customer?.lastName || ""}`.trim()}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {(booking.customer?.firstName || "Unknown")} {booking.customer?.lastName || ""}
                            </p>
                            {booking.customer?.email && (
                              <p className="text-xs text-muted-foreground truncate">{booking.customer.email}</p>
                            )}
                          </div>
                          <Badge variant={booking.checkedIn ? "default" : "secondary"} className="text-xs">
                            {booking.checkedIn ? "Checked In" : "Booked"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Dropdown trigger
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {placeholder}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] p-0 bg-popover border border-border shadow-lg z-50" align="start">
          <SessionSearchContent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading}
            filteredSessions={filteredSessions}
            handleSelectSession={handleSelectSession}
            isSessionSelected={isSessionSelected}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Extracted search content for reuse
function SessionSearchContent({
  searchQuery,
  setSearchQuery,
  isLoading,
  filteredSessions,
  handleSelectSession,
  isSessionSelected
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoading: boolean;
  filteredSessions: ClassSession[];
  handleSelectSession: (s: ClassSession) => void;
  isSessionSelected: (id: number) => boolean;
}) {
  return (
    <>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by class name, teacher, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Format: Class Name | Date | Time | Teacher Name
        </p>
      </div>

      <ScrollArea className="h-[350px]">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="p-2 space-y-1">
            {filteredSessions.map((session) => {
              const selected = isSessionSelected(session.id);
              return (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all border group ${
                    selected 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 border-transparent hover:border-primary/50 hover:shadow-md'
                  }`}
                  onClick={() => handleSelectSession(session)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${
                        selected ? 'text-foreground' : 'text-foreground group-hover:text-white'
                      }`}>
                        {session.displayLabel}
                      </p>
                      <div className={`flex flex-wrap items-center gap-2 mt-1 text-xs transition-colors ${
                        selected ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-white/80'
                      }`}>
                        <span>{session.durationInMinutes} mins</span>
                        {session.inPersonLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.inPersonLocation.name}
                          </span>
                        )}
                        {session.bookingCount !== undefined && (
                          <span>{session.bookingCount}/{session.capacity} booked</span>
                        )}
                      </div>
                    </div>
                    {selected && (
                      <Badge variant="default" className="shrink-0">Selected</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No classes match your search." : "No upcoming classes available."}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

export default ClassSelector;