DROP TRIGGER IF EXISTS farms_set_updated_at ON public.farms;
CREATE TRIGGER farms_set_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();