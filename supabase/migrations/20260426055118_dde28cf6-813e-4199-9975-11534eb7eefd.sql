-- Enable realtime broadcasts for worker daily log tables
-- Use REPLICA IDENTITY FULL so updates carry the full row (not just PK)
ALTER TABLE public.egg_production REPLICA IDENTITY FULL;
ALTER TABLE public.feed_usage REPLICA IDENTITY FULL;
ALTER TABLE public.mortality REPLICA IDENTITY FULL;
ALTER TABLE public.vaccination REPLICA IDENTITY FULL;
ALTER TABLE public.worker_notes REPLICA IDENTITY FULL;

-- Add tables to the realtime publication (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.egg_production;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_usage;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mortality;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vaccination;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_notes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;