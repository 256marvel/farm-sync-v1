-- Idempotency for offline-synced worker logs.
-- Each worker dialog generates a stable UUID per submission. The queue sends
-- it as client_uuid; a unique index ensures a retry after a partial-failure
-- flush cannot create duplicates.

ALTER TABLE public.egg_production ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE public.feed_usage     ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE public.mortality      ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE public.vaccination    ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE public.worker_notes   ADD COLUMN IF NOT EXISTS client_uuid uuid;

CREATE UNIQUE INDEX IF NOT EXISTS egg_production_client_uuid_key ON public.egg_production (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS feed_usage_client_uuid_key     ON public.feed_usage     (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mortality_client_uuid_key      ON public.mortality      (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vaccination_client_uuid_key    ON public.vaccination    (client_uuid) WHERE client_uuid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS worker_notes_client_uuid_key   ON public.worker_notes   (client_uuid) WHERE client_uuid IS NOT NULL;