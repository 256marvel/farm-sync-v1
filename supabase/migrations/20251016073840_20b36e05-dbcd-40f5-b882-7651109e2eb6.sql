-- Add role enum for workers
CREATE TYPE public.worker_role AS ENUM ('caretaker', 'manager', 'assistant_manager', 'accountant', 'worker');

-- Add role and NIN columns to workers table
ALTER TABLE public.workers
ADD COLUMN role worker_role NOT NULL DEFAULT 'worker',
ADD COLUMN nin text;

-- Add comment to explain NIN requirement
COMMENT ON COLUMN public.workers.nin IS 'National ID Number - mandatory for caretaker, manager, assistant_manager, and accountant roles';