ALTER TABLE public.workers
  ALTER COLUMN user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workers_user_id_unique_idx
  ON public.workers (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS workers_auto_generated_username_unique_idx
  ON public.workers (auto_generated_username)
  WHERE auto_generated_username IS NOT NULL;