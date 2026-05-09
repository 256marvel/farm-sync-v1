-- Add image_url column to farms
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS image_url text;

-- Create public storage bucket for farm profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-images', 'farm-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for farm images
CREATE POLICY "Farm images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'farm-images');

-- Owners upload to their farm folder ({farm_id}/...)
CREATE POLICY "Farm owners can upload farm images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'farm-images'
  AND public.user_owns_farm(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Farm owners can update farm images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'farm-images'
  AND public.user_owns_farm(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Farm owners can delete farm images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'farm-images'
  AND public.user_owns_farm(auth.uid(), ((storage.foldername(name))[1])::uuid)
);