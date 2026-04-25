-- Enums for finance entries
CREATE TYPE public.transaction_kind AS ENUM ('income', 'expense', 'loss');

CREATE TYPE public.transaction_category AS ENUM (
  -- income
  'egg_sales',
  'bird_sales',
  'manure_sales',
  'other_income',
  -- expense
  'feed',
  'medicine',
  'vaccines',
  'utilities',
  'repairs',
  'transport',
  'salaries',
  'equipment',
  'other_expense',
  -- loss
  'mortality_loss',
  'theft',
  'damage',
  'other_loss'
);

CREATE TABLE public.farm_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  kind public.transaction_kind NOT NULL,
  category public.transaction_category NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  description text,
  payment_method text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_farm_transactions_farm_date ON public.farm_transactions (farm_id, date DESC);
CREATE INDEX idx_farm_transactions_kind ON public.farm_transactions (farm_id, kind);

ALTER TABLE public.farm_transactions ENABLE ROW LEVEL SECURITY;

-- Helper: identify finance-capable staff (accountant, manager, assistant_manager, caretaker)
CREATE OR REPLACE FUNCTION public.is_farm_finance_staff(_user_id uuid, _farm_id uuid)
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
      AND role IN ('accountant', 'manager', 'assistant_manager', 'caretaker')
  )
$$;

-- Helper: accountant on the farm
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
      AND role = 'accountant'
  )
$$;

-- Policies
CREATE POLICY "Owners manage farm transactions"
ON public.farm_transactions
FOR ALL
USING (public.user_owns_farm(auth.uid(), farm_id))
WITH CHECK (public.user_owns_farm(auth.uid(), farm_id));

CREATE POLICY "Finance staff can view transactions"
ON public.farm_transactions
FOR SELECT
USING (public.is_farm_finance_staff(auth.uid(), farm_id));

CREATE POLICY "Finance staff can record transactions"
ON public.farm_transactions
FOR INSERT
WITH CHECK (
  public.is_farm_finance_staff(auth.uid(), farm_id)
  AND recorded_by = auth.uid()
);

CREATE POLICY "Accountants can update transactions"
ON public.farm_transactions
FOR UPDATE
USING (public.is_farm_accountant(auth.uid(), farm_id))
WITH CHECK (public.is_farm_accountant(auth.uid(), farm_id));

CREATE POLICY "Accountants can delete transactions"
ON public.farm_transactions
FOR DELETE
USING (public.is_farm_accountant(auth.uid(), farm_id));

-- updated_at trigger
CREATE TRIGGER trg_farm_transactions_updated_at
BEFORE UPDATE ON public.farm_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();