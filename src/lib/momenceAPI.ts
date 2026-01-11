// Momence API Service
// Handles customer and session data fetching from Momence via Edge Function

import { supabase } from "@/integrations/supabase/client";

export type MomenceMember = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  pictureUrl?: string;
};

export type MomenceMemberDetails = MomenceMember & Record<string, any>;

export type MomenceSession = {
  id: string;
  name?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  durationInMinutes?: number;
  teacher?: { id?: string; firstName?: string; lastName?: string; email?: string; pictureUrl?: string };
  [key: string]: any;
};

class MomenceAPI {
  private async callEdgeFunction(action: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('momence-api', {
        body: { action, ...params }
      });

      if (error) {
        console.error('Momence edge function error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Momence API call failed:', error);
      throw error;
    }
  }

  async searchCustomers(query: string): Promise<any[]> {
    try {
      console.log('Momence API: Searching for:', query);
      const data = await this.callEdgeFunction('searchMembers', { query });
      console.log('Momence API: Search response:', { 
        resultsCount: data?.payload?.length || 0,
        totalCount: data?.pagination?.totalCount || 0
      });
      return data?.payload || [];
    } catch (error) {
      console.error('Customer search error:', error);
      return [];
    }
  }

  async getCustomerById(memberId: string): Promise<any> {
    try {
      console.log('Momence API: Fetching comprehensive customer data for ID:', memberId);

      // Fetch member details, sessions, and memberships in parallel
      const [memberData, sessionsData, membershipsData] = await Promise.all([
        this.callEdgeFunction('getMemberDetails', { memberId: parseInt(memberId) }),
        this.callEdgeFunction('getMemberSessions', { memberId: parseInt(memberId) }).catch(() => ({ payload: [] })),
        this.callEdgeFunction('getMemberMemberships', { memberId: parseInt(memberId) }).catch(() => ({ payload: [] }))
      ]);

      // Combine all data
      const comprehensiveData = {
        ...memberData,
        sessions: sessionsData?.payload || [],
        activeMemberships: membershipsData?.payload || [],
        totalSessions: (sessionsData?.payload || []).length,
        totalMemberships: (membershipsData?.payload || []).length
      };

      console.log('Momence API: Customer data fetched:', {
        memberId,
        sessionsCount: comprehensiveData.sessions.length,
        membershipsCount: comprehensiveData.activeMemberships.length
      });

      return comprehensiveData;
    } catch (error) {
      console.error('Get customer error:', error);
      return null;
    }
  }

  async getCustomerBookings(memberId: string): Promise<any[]> {
    try {
      const data = await this.callEdgeFunction('getMemberSessions', { memberId: parseInt(memberId) });
      return data?.payload || [];
    } catch (error) {
      console.error('Get customer bookings error:', error);
      return [];
    }
  }

  formatCustomerData(customer: any) {
    const activeMembership = customer.activeMemberships?.[0];
    const recentSessions = customer.sessions?.slice(-5) || [];
    const lastSession = customer.sessions?.[customer.sessions.length - 1];
    
    return {
      id: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phoneNumber || customer.phone || '',
      pictureUrl: customer.pictureUrl || '',
      
      // Timeline data
      firstSeen: customer.firstSeen || null,
      lastSeen: customer.lastSeen || null,
      
      // Visit statistics
      totalVisits: (customer.sessions || []).length || customer.visits?.total || 0,
      totalAppointments: customer.visits?.appointments || 0,
      totalBookings: (customer.sessions || []).filter((s: any) => s.session).length || customer.visits?.bookings || 0,
      appointmentVisits: customer.visits?.appointmentsVisits || 0,
      bookingVisits: (customer.sessions || []).filter((s: any) => s.checkedIn).length || customer.visits?.bookingsVisits || 0,
      openAreaVisits: customer.visits?.openAreaVisits || 0,
      
      // Session data
      sessions: customer.sessions || [],
      totalSessions: (customer.sessions || []).length || customer.totalSessions || 0,
      recentSessions: recentSessions,
      lastSessionDate: lastSession?.session?.startsAt || null,
      lastSessionName: lastSession?.session?.name || null,
      
      // Membership data
      activeMemberships: customer.activeMemberships || [],
      totalMemberships: customer.totalMemberships || 0,
      currentMembershipName: activeMembership?.membership?.name || null,
      currentMembershipType: activeMembership?.type || null,
      membershipStartDate: activeMembership?.startDate || null,
      membershipEndDate: activeMembership?.endDate || null,
      membershipFrozen: activeMembership?.isFrozen || false,
      creditsLeft: activeMembership?.eventCreditsLeft || null,
      sessionsUsed: activeMembership?.usedSessions || 0,
      sessionsLimit: activeMembership?.usageLimitForSessions || null,
      appointmentsUsed: activeMembership?.usedAppointments || 0,
      appointmentsLimit: activeMembership?.usageLimitForAppointments || null,
      
      // Custom fields and tags
      customerFields: customer.customerFields || [],
      customerTags: customer.customerTags || [],
      
      // Computed status
      membershipStatus: this.getMembershipStatus(activeMembership),
      activityLevel: this.getActivityLevel(customer.visits?.total || 0),
      
      // Legacy fields for compatibility
      membershipId: activeMembership?.membership?.id || '',
      joinDate: customer.firstSeen || null,
      lastVisit: customer.lastSeen || null,
      notes: customer.notes || '',
    };
  }

  private getMembershipStatus(membership: any): string {
    if (!membership) return 'inactive';
    if (membership.isFrozen) return 'frozen';
    
    const endDate = membership.endDate ? new Date(membership.endDate) : null;
    const now = new Date();
    
    if (endDate && endDate < now) return 'expired';
    return 'active';
  }

  private getActivityLevel(totalVisits: number): string {
    if (totalVisits === 0) return 'new';
    if (totalVisits <= 5) return 'beginner';
    if (totalVisits <= 20) return 'regular';
    if (totalVisits <= 50) return 'frequent';
    return 'vip';
  }

  // Session management methods
  async getSessions(page: number = 0, pageSize: number = 200): Promise<any> {
    try {
      console.log(`Momence API: Fetching sessions page ${page}`);
      const data = await this.callEdgeFunction('getSessions', { page, pageSize });
      console.log(`Momence API: Successfully fetched ${data?.payload?.length || 0} sessions`);
      return data;
    } catch (error) {
      console.error('Get sessions error:', error);
      return { payload: [], pagination: { totalCount: 0, page: 0, pageSize: 0 } };
    }
  }

  async getSessionById(sessionId: string): Promise<any> {
    try {
      console.log(`Momence API: Fetching session details for ${sessionId}`);
      const data = await this.callEdgeFunction('getSessionDetails', { sessionId: parseInt(sessionId) });
      console.log(`Momence API: Successfully fetched details for session ${sessionId}`);
      return data;
    } catch (error) {
      console.error('Get session details error:', error);
      return null;
    }
  }

  async getAllSessionsWithDetails(maxPages: number = 5): Promise<any[]> {
    try {
      let allSessions: any[] = [];
      let currentPage = 0;
      let hasMoreData = true;

      console.log(`Momence API: Starting to fetch all sessions with details (max ${maxPages} pages)`);

      while (hasMoreData && currentPage < maxPages) {
        const response = await this.getSessions(currentPage, 200);
        
        if (response.payload && response.payload.length > 0) {
          console.log(`Momence API: Processing page ${currentPage} with ${response.payload.length} sessions`);
          
          // Fetch detailed information for each session
          const sessionsWithDetails = await Promise.all(
            response.payload.map(async (session: any) => {
              try {
                const detailedSession = await this.getSessionById(session.id);
                return {
                  ...session,
                  detailedInfo: detailedSession
                };
              } catch (error) {
                console.error(`Error fetching details for session ${session.id}:`, error);
                return session;
              }
            })
          );

          allSessions = [...allSessions, ...sessionsWithDetails];
          
          if (response.payload.length < 200 || response.pagination?.totalCount <= (currentPage + 1) * 200) {
            hasMoreData = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreData = false;
        }
      }

      console.log(`Momence API: Fetched total of ${allSessions.length} sessions with details`);
      return allSessions;
    } catch (error) {
      console.error('Error fetching all sessions with details:', error);
      return [];
    }
  }

  formatSessionData(session: any): any {
    if (!session) return null;

    const detailed = session.detailedInfo || session;
    
    return {
      id: session.id,
      name: session.name,
      description: session.description,
      type: session.type,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      durationInMinutes: session.durationInMinutes,
      capacity: detailed.capacity || session.capacity,
      bookingCount: detailed.bookingCount || session.bookingCount,
      waitlistCapacity: detailed.waitlistCapacity,
      waitlistBookingCount: detailed.waitlistBookingCount,
      teacher: {
        id: session.teacher?.id,
        firstName: session.teacher?.firstName,
        lastName: session.teacher?.lastName,
        fullName: `${session.teacher?.firstName || ''} ${session.teacher?.lastName || ''}`.trim(),
        email: detailed.teacher?.email || session.teacher?.email,
        pictureUrl: session.teacher?.pictureUrl
      },
      originalTeacher: detailed.originalTeacher,
      additionalTeachers: detailed.additionalTeachers || [],
      isRecurring: session.isRecurring,
      isCancelled: session.isCancelled,
      isInPerson: session.isInPerson,
      isDraft: session.isDraft,
      inPersonLocation: session.inPersonLocation,
      zoomLink: detailed.zoomLink,
      zoomMeetingId: detailed.zoomMeetingId,
      zoomMeetingPassword: detailed.zoomMeetingPassword,
      onlineStreamUrl: session.onlineStreamUrl || detailed.onlineStreamUrl,
      onlineStreamPassword: session.onlineStreamPassword || detailed.onlineStreamPassword,
      bannerImageUrl: session.bannerImageUrl,
      hostPhotoUrl: session.hostPhotoUrl,
      tags: session.tags || [],
      availableSpots: (detailed.capacity || session.capacity || 0) - (detailed.bookingCount || session.bookingCount || 0),
      utilizationRate: detailed.capacity ? Math.round(((detailed.bookingCount || 0) / detailed.capacity) * 100) : 0,
      sessionStatus: session.isCancelled ? 'Cancelled' : session.isDraft ? 'Draft' : 'Active'
    };
  }
}

export const momenceAPI = new MomenceAPI();
