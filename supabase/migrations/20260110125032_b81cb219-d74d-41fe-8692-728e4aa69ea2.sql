-- Fix MISSING_RLS: Update ticketComments RLS policy to filter internal comments
-- Only admins/managers should see internal comments

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read comments on accessible tickets" ON public."ticketComments";

-- Create new policy with internal comment filtering
-- Non-internal comments: visible to anyone with ticket access
-- Internal comments (isInternal = true): only visible to admins/managers
CREATE POLICY "Users can read comments on accessible tickets" ON public."ticketComments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = "ticketId" 
      AND (t."assignedToUserId" = auth.uid()::text 
           OR t."reportedByUserId" = auth.uid()::text 
           OR public.is_admin_or_manager(auth.uid()::text))
    )
    AND (
      "isInternal" IS NOT TRUE
      OR public.is_admin_or_manager(auth.uid()::text)
    )
  );