-- ============================================================
-- 1. Dual role: manager can also be accountant
-- ============================================================
ALTER TABLE public.workers
  ADD COLUMN is_also_accountant boolean NOT NULL DEFAULT false;

-- Only managers may carry the also-accountant flag
ALTER TABLE public.workers
  ADD CONSTRAINT workers_dual_role_only_manager
  CHECK (NOT is_also_accountant OR role = 'manager');

-- Update role resolver: a manager flagged as also_accountant is treated as accountant
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
      SELECT
        CASE
          WHEN role = 'manager' AND is_also_accountant THEN 'accountant'
          ELSE role::text
        END
      FROM public.workers
      WHERE user_id = _user_id AND farm_id = _farm_id AND is_active = true
      LIMIT 1
    )
  END
$$;

-- Update accountant helper to treat dual-role manager as accountant
CREATE OR REPLACE FUNCTION public.is_farm_accountant(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workers
    WHERE user_id = _user_id
      AND farm_id = _farm_id
      AND is_active = true
      AND (role = 'accountant' OR (role = 'manager' AND is_also_accountant))
  )
$$;

-- ============================================================
-- 2. Inventory module
-- ============================================================
CREATE TYPE public.inventory_category AS ENUM (
  'feed',
  'vaccine',
  'medicine',
  'equipment',
  'other'
);

CREATE TYPE public.inventory_movement_type AS ENUM (
  'received',
  'used',
  'adjusted',
  'lost'
);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.inventory_category NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  current_quantity numeric(14, 3) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(14, 3) NOT NULL DEFAULT 0,
  unit_cost numeric(14, 2),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, name, category)
);

CREATE INDEX idx_inventory_items_farm ON public.inventory_items (farm_id, category);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL,
  movement_type public.inventory_movement_type NOT NULL,
  quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  unit_cost numeric(14, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_item ON public.inventory_movements (item_id, date DESC);
CREATE INDEX idx_inventory_movements_farm ON public.inventory_movements (farm_id, date DESC);

-- Trigger: keep current_quantity in sync
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  delta numeric(14, 3);
BEGIN
  IF NEW.movement_type IN ('received') THEN
    delta := NEW.quantity;
  ELSIF NEW.movement_type IN ('used', 'lost') THEN
    delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'adjusted' THEN
    -- Treat positive quantity as add; user can record negative effect via 'lost'/'used'
    delta := NEW.quantity;
  ELSE
    delta := 0;
  END IF;

  UPDATE public.inventory_items
  SET current_quantity = GREATEST(current_quantity + delta, 0),
      updated_at = now()
  WHERE id = NEW.item_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.apply_inventory_movement();

CREATE TRIGGER trg_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Auto-deduct from feed_usage / vaccination logs
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_deduct_feed_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_item_id uuid;
BEGIN
  -- Find a feed item on this farm whose name matches (case-insensitive)
  SELECT id INTO matched_item_id
  FROM public.inventory_items
  WHERE farm_id = NEW.farm_id
    AND category = 'feed'
    AND lower(name) = lower(NEW.feed_type)
    AND is_active = true
  LIMIT 1;

  IF matched_item_id IS NOT NULL AND NEW.quantity_used_kg > 0 THEN
    INSERT INTO public.inventory_movements (farm_id, item_id, recorded_by, movement_type, quantity, date, notes)
    VALUES (NEW.farm_id, matched_item_id, auth.uid(), 'used', NEW.quantity_used_kg, NEW.date, 'Auto: feed usage log');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_deduct_feed_inventory
AFTER INSERT ON public.feed_usage
FOR EACH ROW
EXECUTE FUNCTION public.auto_deduct_feed_inventory();

CREATE OR REPLACE FUNCTION public.auto_deduct_vaccine_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_item_id uuid;
BEGIN
  SELECT id INTO matched_item_id
  FROM public.inventory_items
  WHERE farm_id = NEW.farm_id
    AND category = 'vaccine'
    AND lower(name) = lower(NEW.vaccine_name)
    AND is_active = true
  LIMIT 1;

  IF matched_item_id IS NOT NULL AND NEW.birds_vaccinated > 0 THEN
    -- Deduct 1 dose per bird vaccinated
    INSERT INTO public.inventory_movements (farm_id, item_id, recorded_by, movement_type, quantity, date, notes)
    VALUES (NEW.farm_id, matched_item_id, auth.uid(), 'used', NEW.birds_vaccinated, NEW.date, 'Auto: vaccination log');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_deduct_vaccine_inventory
AFTER INSERT ON public.vaccination
FOR EACH ROW
EXECUTE FUNCTION public.auto_deduct_vaccine_inventory();

-- ============================================================
-- 4. RLS for inventory
-- ============================================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Owners
CREATE POLICY "Owners manage inventory items"
ON public.inventory_items
FOR ALL
USING (public.user_owns_farm(auth.uid(), farm_id))
WITH CHECK (public.user_owns_farm(auth.uid(), farm_id));

CREATE POLICY "Owners manage inventory movements"
ON public.inventory_movements
FOR ALL
USING (public.user_owns_farm(auth.uid(), farm_id))
WITH CHECK (public.user_owns_farm(auth.uid(), farm_id));

-- Anyone on the farm (workers + staff) can VIEW inventory so they know what's available
CREATE POLICY "Farm members view inventory items"
ON public.inventory_items
FOR SELECT
USING (public.is_worker_on_farm(auth.uid(), farm_id));

CREATE POLICY "Farm members view inventory movements"
ON public.inventory_movements
FOR SELECT
USING (public.is_worker_on_farm(auth.uid(), farm_id));

-- Finance staff (incl. dual-role manager via is_farm_finance_staff already includes manager)
-- can add/edit items
CREATE POLICY "Finance staff add inventory items"
ON public.inventory_items
FOR INSERT
WITH CHECK (public.is_farm_finance_staff(auth.uid(), farm_id));

CREATE POLICY "Finance staff update inventory items"
ON public.inventory_items
FOR UPDATE
USING (public.is_farm_finance_staff(auth.uid(), farm_id))
WITH CHECK (public.is_farm_finance_staff(auth.uid(), farm_id));

-- Finance staff record movements
CREATE POLICY "Finance staff record movements"
ON public.inventory_movements
FOR INSERT
WITH CHECK (
  public.is_farm_finance_staff(auth.uid(), farm_id)
  AND recorded_by = auth.uid()
);
