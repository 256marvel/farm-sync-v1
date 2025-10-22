-- Create tables for worker daily data entries

-- Egg Production table
CREATE TABLE public.egg_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trays_collected INTEGER NOT NULL CHECK (trays_collected >= 0),
  eggs_per_tray INTEGER NOT NULL CHECK (eggs_per_tray >= 0),
  damaged_trays INTEGER NOT NULL DEFAULT 0 CHECK (damaged_trays >= 0),
  damaged_eggs INTEGER NOT NULL DEFAULT 0 CHECK (damaged_eggs >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feed Usage table
CREATE TABLE public.feed_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  feed_type TEXT NOT NULL,
  quantity_used_kg NUMERIC NOT NULL CHECK (quantity_used_kg >= 0),
  remaining_stock_kg NUMERIC NOT NULL CHECK (remaining_stock_kg >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mortality table
CREATE TABLE public.mortality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  number_dead INTEGER NOT NULL CHECK (number_dead >= 0),
  suspected_cause TEXT NOT NULL,
  age_weeks INTEGER NOT NULL CHECK (age_weeks >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vaccination table
CREATE TABLE public.vaccination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vaccine_name TEXT NOT NULL,
  birds_vaccinated INTEGER NOT NULL CHECK (birds_vaccinated >= 0),
  administered_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Worker Notes table
CREATE TABLE public.worker_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.egg_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for egg_production
CREATE POLICY "Workers can view their own egg production data"
ON public.egg_production FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = egg_production.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can insert their own egg production data"
ON public.egg_production FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = egg_production.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update their own egg production data"
ON public.egg_production FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = egg_production.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can view all egg production"
ON public.egg_production FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = egg_production.farm_id
    AND farms.owner_id = auth.uid()
  )
);

-- RLS Policies for feed_usage
CREATE POLICY "Workers can view their own feed usage data"
ON public.feed_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = feed_usage.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can insert their own feed usage data"
ON public.feed_usage FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = feed_usage.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update their own feed usage data"
ON public.feed_usage FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = feed_usage.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can view all feed usage"
ON public.feed_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = feed_usage.farm_id
    AND farms.owner_id = auth.uid()
  )
);

-- RLS Policies for mortality
CREATE POLICY "Workers can view their own mortality data"
ON public.mortality FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = mortality.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can insert their own mortality data"
ON public.mortality FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = mortality.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update their own mortality data"
ON public.mortality FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = mortality.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can view all mortality"
ON public.mortality FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = mortality.farm_id
    AND farms.owner_id = auth.uid()
  )
);

-- RLS Policies for vaccination
CREATE POLICY "Workers can view their own vaccination data"
ON public.vaccination FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = vaccination.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can insert their own vaccination data"
ON public.vaccination FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = vaccination.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update their own vaccination data"
ON public.vaccination FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = vaccination.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can view all vaccination"
ON public.vaccination FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = vaccination.farm_id
    AND farms.owner_id = auth.uid()
  )
);

-- RLS Policies for worker_notes
CREATE POLICY "Workers can view their own notes"
ON public.worker_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = worker_notes.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can insert their own notes"
ON public.worker_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = worker_notes.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update their own notes"
ON public.worker_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workers
    WHERE workers.id = worker_notes.worker_id
    AND workers.user_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can view all worker notes"
ON public.worker_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = worker_notes.farm_id
    AND farms.owner_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_egg_production_updated_at
BEFORE UPDATE ON public.egg_production
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feed_usage_updated_at
BEFORE UPDATE ON public.feed_usage
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mortality_updated_at
BEFORE UPDATE ON public.mortality
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccination_updated_at
BEFORE UPDATE ON public.vaccination
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_notes_updated_at
BEFORE UPDATE ON public.worker_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();