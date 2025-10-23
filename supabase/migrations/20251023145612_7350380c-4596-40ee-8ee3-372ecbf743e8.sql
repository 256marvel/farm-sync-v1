-- Update handle_new_user trigger to check metadata and assign appropriate role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile for all users
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.phone
  );
  
  -- Assign role based on metadata
  -- If is_worker is true in metadata, assign worker role
  -- Otherwise, assign owner role (for regular signups)
  IF (NEW.raw_user_meta_data->>'is_worker')::boolean = true THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'worker'::app_role);
  ELSIF (NEW.raw_user_meta_data->>'role') IS NOT NULL THEN
    -- For other roles like caretaker, manager, etc.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  ELSE
    -- Default to owner for regular signups
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;