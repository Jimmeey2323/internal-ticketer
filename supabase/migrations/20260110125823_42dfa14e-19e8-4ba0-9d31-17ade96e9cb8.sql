-- Create escalation rules table for comprehensive escalation management
CREATE TABLE IF NOT EXISTS public."escalationRules" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  -- Trigger conditions
  "triggerType" text NOT NULL DEFAULT 'sla_breach', -- sla_breach, time_elapsed, priority_change, no_response, customer_request
  "triggerValue" integer, -- e.g., hours elapsed, percentage of SLA
  -- Matching criteria (when to apply this rule)
  "categoryId" uuid REFERENCES public.categories(id),
  "subcategoryId" uuid REFERENCES public.subcategories(id),
  "studioId" uuid REFERENCES public.studios(id),
  priority text, -- low, medium, high, critical
  -- Actions
  "escalateTo" text, -- user_id of the escalation target
  "escalateToTeamId" uuid REFERENCES public.teams(id),
  "escalateToDepartmentId" uuid REFERENCES public.departments(id),
  "notifyRoles" text[] DEFAULT '{}', -- admin, manager, etc.
  "changePriority" text, -- upgrade priority to this level
  "sendNotification" boolean DEFAULT true,
  "notificationTemplate" text,
  -- Configuration
  "runOrder" integer DEFAULT 0,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."escalationRules" ENABLE ROW LEVEL SECURITY;

-- Only admins/managers can manage escalation rules
CREATE POLICY "Admins can manage escalation rules" ON public."escalationRules"
  FOR ALL USING (public.is_admin_or_manager(auth.uid()::text));

-- Authenticated users can read escalation rules
CREATE POLICY "Authenticated users can read escalation rules" ON public."escalationRules"
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create saved reports table
CREATE TABLE IF NOT EXISTS public."savedReports" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  "reportType" text NOT NULL DEFAULT 'custom', -- custom, sla_compliance, team_performance, escalation, trend
  -- Report configuration
  filters jsonb DEFAULT '{}', -- date range, categories, studios, teams, etc.
  columns text[] DEFAULT '{}', -- selected columns/metrics
  "groupBy" text, -- field to group by
  "sortBy" text,
  "sortOrder" text DEFAULT 'desc',
  "chartType" text, -- bar, line, pie, table
  -- Scheduling
  schedule text, -- cron expression or null for manual
  "lastRunAt" timestamptz,
  "nextRunAt" timestamptz,
  -- Recipients for scheduled reports
  recipients text[] DEFAULT '{}', -- email addresses
  -- Access control
  "createdBy" text NOT NULL,
  "isPublic" boolean DEFAULT false, -- shared with all users
  "sharedWith" text[] DEFAULT '{}', -- specific user IDs
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."savedReports" ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reports
CREATE POLICY "Users can manage own reports" ON public."savedReports"
  FOR ALL USING (
    "createdBy" = auth.uid()::text 
    OR public.is_admin_or_manager(auth.uid()::text)
  );

-- Users can read public reports or reports shared with them
CREATE POLICY "Users can read accessible reports" ON public."savedReports"
  FOR SELECT USING (
    "createdBy" = auth.uid()::text 
    OR "isPublic" = true 
    OR auth.uid()::text = ANY("sharedWith")
    OR public.is_admin_or_manager(auth.uid()::text)
  );

-- Create escalation log table to track all escalations
CREATE TABLE IF NOT EXISTS public."escalationLog" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "ticketId" uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  "ruleId" uuid REFERENCES public."escalationRules"(id),
  "escalationType" text NOT NULL, -- automatic, manual
  "escalatedFrom" text, -- user_id
  "escalatedTo" text, -- user_id
  "escalatedToTeamId" uuid REFERENCES public.teams(id),
  "escalatedToDepartmentId" uuid REFERENCES public.departments(id),
  "previousPriority" text,
  "newPriority" text,
  reason text,
  notes text,
  "createdAt" timestamptz DEFAULT now(),
  "createdBy" text -- user_id who triggered (null for automatic)
);

-- Enable RLS
ALTER TABLE public."escalationLog" ENABLE ROW LEVEL SECURITY;

-- Users can read escalation logs for tickets they have access to
CREATE POLICY "Users can read escalation logs" ON public."escalationLog"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = "ticketId" 
      AND (t."assignedToUserId" = auth.uid()::text 
           OR t."reportedByUserId" = auth.uid()::text 
           OR public.is_admin_or_manager(auth.uid()::text))
    )
  );

-- Admins can manage all escalation logs
CREATE POLICY "Admins can manage escalation logs" ON public."escalationLog"
  FOR ALL USING (public.is_admin_or_manager(auth.uid()::text));

-- Authenticated users can create escalation logs
CREATE POLICY "Authenticated users can create escalation logs" ON public."escalationLog"
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON public."escalationRules"("isActive", "runOrder");
CREATE INDEX IF NOT EXISTS idx_escalation_log_ticket ON public."escalationLog"("ticketId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON public."savedReports"("createdBy");
CREATE INDEX IF NOT EXISTS idx_saved_reports_public ON public."savedReports"("isPublic");