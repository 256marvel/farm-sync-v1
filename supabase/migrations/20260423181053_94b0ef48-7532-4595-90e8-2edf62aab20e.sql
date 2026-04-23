-- Add salary and house assignment fields to workers
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS monthly_salary numeric(12,2),
  ADD COLUMN IF NOT EXISTS house_assignment text;

-- Helper function: is the current user a senior staff member at a farm?
-- (owner, manager, assistant_manager, caretaker, accountant)
CREATE OR REPLACE FUNCTION public.get_user_farm_role(_user_id uuid, _farm_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.farms WHERE id = _farm_id AND owner_id = _user_id)
      THEN 'owner'
    ELSE (
      SELECT role::text FROM public.workers
      WHERE user_id = _user_id AND farm_id = _farm_id AND is_active = true
      LIMIT 1
    )
  END
$$;