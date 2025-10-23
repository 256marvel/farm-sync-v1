-- Create security definer function to check if user is a worker on a farm
CREATE OR REPLACE FUNCTION public.is_worker_on_farm(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workers
    WHERE user_id = _user_id AND farm_id = _farm_id AND is_active = true
  )
$$;

-- Create security definer function to get worker's farm_id
CREATE OR REPLACE FUNCTION public.get_worker_farm_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT farm_id
  FROM public.workers
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Workers can view coworkers" ON public.workers;
DROP POLICY IF EXISTS "Workers can view their assigned farm" ON public.farms;

-- Recreate policies using security definer functions
CREATE POLICY "Workers can view coworkers"
ON public.workers
FOR SELECT
USING (
  public.is_worker_on_farm(auth.uid(), workers.farm_id)
);

CREATE POLICY "Workers can view their assigned farm"
ON public.farms
FOR SELECT
USING (
  farms.id = public.get_worker_farm_id(auth.uid())
);