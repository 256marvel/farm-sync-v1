-- Create security definer function to check if user owns a farm
CREATE OR REPLACE FUNCTION public.user_owns_farm(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.farms
    WHERE id = _farm_id AND owner_id = _user_id
  )
$$;

-- Update workers RLS policies to use security definer function
DROP POLICY IF EXISTS "Farm owners can create workers" ON public.workers;
DROP POLICY IF EXISTS "Farm owners can view workers" ON public.workers;
DROP POLICY IF EXISTS "Farm owners can update workers" ON public.workers;
DROP POLICY IF EXISTS "Farm owners can delete workers" ON public.workers;

CREATE POLICY "Farm owners can create workers"
ON public.workers
FOR INSERT
WITH CHECK (public.user_owns_farm(auth.uid(), farm_id));

CREATE POLICY "Farm owners can view workers"
ON public.workers
FOR SELECT
USING (public.user_owns_farm(auth.uid(), farm_id));

CREATE POLICY "Farm owners can update workers"
ON public.workers
FOR UPDATE
USING (public.user_owns_farm(auth.uid(), farm_id));

CREATE POLICY "Farm owners can delete workers"
ON public.workers
FOR DELETE
USING (public.user_owns_farm(auth.uid(), farm_id));