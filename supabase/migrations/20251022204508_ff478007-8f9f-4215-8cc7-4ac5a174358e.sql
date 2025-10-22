-- Add RLS policies for workers to access their own data and their farm

-- Workers can view their own worker record
CREATE POLICY "Workers can view their own profile"
ON public.workers
FOR SELECT
USING (auth.uid() = user_id);

-- Workers can update their own record (limited fields)
CREATE POLICY "Workers can update their own profile"
ON public.workers
FOR UPDATE
USING (auth.uid() = user_id);

-- Workers can view their assigned farm
CREATE POLICY "Workers can view their assigned farm"
ON public.farms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.farm_id = farms.id
    AND workers.user_id = auth.uid()
  )
);

-- Workers can view other workers in the same farm
CREATE POLICY "Workers can view coworkers"
ON public.workers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers AS my_worker
    WHERE my_worker.user_id = auth.uid()
    AND my_worker.farm_id = workers.farm_id
  )
);