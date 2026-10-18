ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

CREATE OR REPLACE FUNCTION public.end_session(p_code text)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target public.sessions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in';
  END IF;
  SELECT * INTO target
  FROM public.sessions
  WHERE code = upper(trim(p_code));
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Not found';
  END IF;
  IF target.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your session';
  END IF;
  UPDATE public.sessions
  SET ended_at = COALESCE(ended_at, now()),
      asking_open = false
  WHERE id = target.id
  RETURNING * INTO target;
  RETURN target;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_session(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target public.sessions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in';
  END IF;
  SELECT * INTO target
  FROM public.sessions
  WHERE code = upper(trim(p_code));
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'Not found';
  END IF;
  IF target.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your session';
  END IF;
  DELETE FROM public.sessions WHERE id = target.id;
END;
$$;

REVOKE ALL ON FUNCTION public.end_session(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_session(text) TO authenticated;
