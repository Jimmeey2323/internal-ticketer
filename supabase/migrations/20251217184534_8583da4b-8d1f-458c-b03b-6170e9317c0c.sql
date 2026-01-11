-- Enable RLS on momence_sessions table
ALTER TABLE public.momence_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read session data (public schedule info)
CREATE POLICY "Authenticated users can read sessions"
ON public.momence_sessions
FOR SELECT
TO authenticated
USING (true);

-- Only admins/managers can modify session data
CREATE POLICY "Admins can manage sessions"
ON public.momence_sessions
FOR ALL
TO authenticated
USING (is_admin_or_manager((auth.uid())::text))
WITH CHECK (is_admin_or_manager((auth.uid())::text));