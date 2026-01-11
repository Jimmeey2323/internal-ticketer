import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOMENCE_BASE_URL = "https://api.momence.com/api/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MomenceRequest {
  action: "searchMembers" | "getMemberSessions" | "getMemberMemberships" | "getSessions" | "getSessionDetails" | "getMemberDetails" | "getSessionBookings";
  query?: string;
  memberId?: number;
  sessionId?: number;
  page?: number;
  pageSize?: number;
}

// Token cache to avoid re-authenticating on every request
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function authenticate(): Promise<string | null> {
  const authToken = Deno.env.get("MOMENCE_AUTH_TOKEN");
  const username = Deno.env.get("MOMENCE_USERNAME");
  const password = Deno.env.get("MOMENCE_PASSWORD");

  if (!authToken || !username || !password) {
    console.error("Missing Momence OAuth credentials");
    return null;
  }

  // Check if we have a valid cached token
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    console.log("Using cached access token");
    return cachedAccessToken;
  }

  console.log("Authenticating with Momence OAuth...");
  
  try {
    const response = await fetch(`${MOMENCE_BASE_URL}/auth/token`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authorization": `Basic ${authToken}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: username,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Momence OAuth failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Momence OAuth success:", { 
      hasAccessToken: !!data.access_token,
      expiresIn: data.expires_in 
    });

    cachedAccessToken = data.access_token;
    // Set expiry (default to 1 hour if not provided)
    tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
    
    return cachedAccessToken;
  } catch (error) {
    console.error("Momence OAuth error:", error);
    return null;
  }
}

// Verify Supabase user authentication
async function verifyUser(req: Request): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return { user: null, error: "Server configuration error" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("User verification failed:", error?.message);
    return { user: null, error: "Unauthorized - invalid or expired token" };
  }

  // Check if user has a role (admin, manager, staff, or viewer can access Momence data)
  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) {
    console.error("Role check failed:", roleError.message);
    return { user: null, error: "Failed to verify user permissions" };
  }

  if (!roles || roles.length === 0) {
    console.error("User has no roles assigned:", data.user.id);
    return { user: null, error: "Insufficient permissions - no role assigned" };
  }

  console.log("User authenticated:", { userId: data.user.id, roles: roles.map(r => r.role) });
  return { user: data.user };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication first
    const { user, error: authError } = await verifyUser(req);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Now authenticate with Momence API
    const accessToken = await authenticate();
    
    if (!accessToken) {
      throw new Error("Failed to authenticate with Momence API");
    }

    const { action, query, memberId, sessionId, page = 0, pageSize = 100 }: MomenceRequest = await req.json();
    
    const headers = {
      "accept": "application/json",
      "authorization": `Bearer ${accessToken}`,
    };

    let url: string;
    let response: Response;

    switch (action) {
      case "searchMembers":
        url = `${MOMENCE_BASE_URL}/host/members?page=${page}&pageSize=${pageSize}&sortOrder=DESC&sortBy=lastSeenAt&query=${encodeURIComponent(query || "")}`;
        console.log("Searching members with query:", query);
        response = await fetch(url, { headers });
        break;

      case "getMemberDetails":
        if (!memberId) throw new Error("memberId is required");
        url = `${MOMENCE_BASE_URL}/host/members/${memberId}`;
        console.log("Getting member details:", memberId);
        response = await fetch(url, { headers });
        break;

      case "getMemberSessions":
        if (!memberId) throw new Error("memberId is required");
        const currentDate = new Date().toISOString();
        url = `${MOMENCE_BASE_URL}/host/members/${memberId}/sessions?page=${page}&pageSize=${pageSize}&sortOrder=DESC&sortBy=startsAt&startBefore=${encodeURIComponent(currentDate)}&includeCancelled=false`;
        console.log("Getting sessions for member:", memberId);
        response = await fetch(url, { headers });
        break;

      case "getMemberMemberships":
        if (!memberId) throw new Error("memberId is required");
        url = `${MOMENCE_BASE_URL}/host/members/${memberId}/bought-memberships/active?page=${page}&pageSize=200`;
        console.log("Getting memberships for member:", memberId);
        response = await fetch(url, { headers });
        break;

      case "getSessions":
        // Get sessions up to today's date in ISO format (2021-08-01T10:00:00Z)
        const todaysDate = new Date().toISOString();
        url = `${MOMENCE_BASE_URL}/host/sessions?page=${page}&pageSize=${pageSize}&sortOrder=DESC&sortBy=startsAt&includeCancelled=false&startBefore=${encodeURIComponent(todaysDate)}`;
        console.log("Getting sessions with startBefore:", todaysDate);
        response = await fetch(url, { headers });
        break;

      case "getSessionDetails":
        if (!sessionId) throw new Error("sessionId is required");
        url = `${MOMENCE_BASE_URL}/host/sessions/${sessionId}`;
        console.log("Getting session details:", sessionId);
        response = await fetch(url, { headers });
        break;

      case "getSessionBookings":
        if (!sessionId) throw new Error("sessionId is required");
        url = `${MOMENCE_BASE_URL}/host/sessions/${sessionId}/bookings?page=${page}&pageSize=${pageSize}&sortOrder=DESC&sortBy=firstName&includeCancelled=true`;
        console.log("Getting session bookings:", sessionId);
        response = await fetch(url, { headers });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Momence API error:", response.status, errorText);
      
      // If unauthorized, clear cached token and retry once
      if (response.status === 401) {
        console.log("Token expired, clearing cache for next request");
        cachedAccessToken = null;
        tokenExpiresAt = 0;
      }
      
      throw new Error(`Momence API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`${action} successful, returned ${data.payload?.length || 1} items`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in momence-api:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
