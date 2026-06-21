-- 019_admin_exercise_content.sql
-- Let an app admin curate the description / video URL on ANY exercise
-- (including the shared built-in library rows, user_id = NULL) so a specific,
-- embeddable video can replace the generic "search YouTube" link.

CREATE OR REPLACE FUNCTION admin_update_exercise_content(
  p_uuid TEXT, p_description TEXT, p_video_url TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  UPDATE exercises
     SET description = NULLIF(btrim(p_description), ''),
         video_url   = NULLIF(btrim(p_video_url), ''),
         updated_at  = now()
   WHERE id = p_uuid::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_exercise_content(TEXT, TEXT, TEXT) TO authenticated;
