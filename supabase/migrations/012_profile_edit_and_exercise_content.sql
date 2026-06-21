-- 012_profile_edit_and_exercise_content.sql
-- (a) Let a user safely edit their OWN display name without being able to
--     escalate their role/status/plan. (b) Seed descriptions + video links
--     onto the built-in exercise library.

-- ─────────────────────────────────────────────────────────────────────────
-- (a) Self-service display name
-- ─────────────────────────────────────────────────────────────────────────

-- The previous broad "profiles_update_own" policy let a user UPDATE any column
-- of their own row — including role='admin' or status='active'. RLS can't see
-- OLD vs NEW per-column, so we drop that policy and funnel the one legitimate
-- self-edit (display_name) through a SECURITY DEFINER function instead.
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE OR REPLACE FUNCTION update_my_display_name(p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE profiles
     SET display_name = NULLIF(btrim(p_name), ''),
         updated_at = now()
   WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_my_display_name(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- (b) Exercise content: descriptions + a "how to" video search link
-- ─────────────────────────────────────────────────────────────────────────

UPDATE exercises e SET description = v.d
FROM (VALUES
  ('Barbell Bench Press', 'Lie flat, feet planted, shoulder blades retracted. Lower the bar to mid-chest and press up without flaring the elbows.'),
  ('Incline Barbell Bench Press', 'Bench set to 30–45°. Press from the upper chest; keeps tension on the clavicular pecs.'),
  ('Dumbbell Bench Press', 'Greater range of motion than the barbell. Lower until you feel a stretch, press the dumbbells together at the top.'),
  ('Incline Dumbbell Press', 'Incline bench, palms forward. Emphasises the upper chest and lets each arm work independently.'),
  ('Cable Fly', 'Slight bend in the elbows, hug the cables together in an arc. Squeeze the chest, control the stretch.'),
  ('Push-up', 'Body in a straight line, hands just wider than shoulders. Lower the chest to the floor, push back up.'),
  ('Chest Dip', 'Lean the torso forward to bias the chest. Lower until the shoulders are just below the elbows.'),
  ('Deadlift', 'Hip-hinge with a flat back, bar over mid-foot. Drive through the heels and lock out hips and knees together.'),
  ('Barbell Row', 'Hinge to ~45°, pull the bar to the lower ribs, squeeze the shoulder blades, lower under control.'),
  ('Pull-up', 'Overhand grip, pull the chest toward the bar, lead with the elbows, full hang at the bottom.'),
  ('Chin-up', 'Underhand grip — more biceps involvement. Pull until the chin clears the bar.'),
  ('Lat Pulldown', 'Tall chest, pull the bar to the upper chest, drive the elbows down and back.'),
  ('Seated Cable Row', 'Neutral spine, pull to the navel, squeeze the back; avoid leaning back to cheat the weight.'),
  ('Dumbbell Row', 'One hand braced on the bench, pull the dumbbell to the hip, control the stretch.'),
  ('T-Bar Row', 'Hinged torso, neutral grip, row to the chest with a strong squeeze of the mid-back.'),
  ('Back Squat', 'Bar on the upper traps, brace, sit down and back to depth, drive up keeping the chest tall.'),
  ('Front Squat', 'Bar on the front delts, elbows high. More upright torso, heavy quad emphasis.'),
  ('Romanian Deadlift', 'Soft knees, push the hips back, lower the bar along the legs until you feel the hamstrings, then drive forward.'),
  ('Leg Press', 'Feet shoulder-width on the platform, lower to ~90°, press without locking the knees harshly.'),
  ('Leg Extension', 'Isolates the quads. Extend fully, squeeze at the top, lower slowly.'),
  ('Leg Curl', 'Isolates the hamstrings. Curl with control, full squeeze, slow negative.'),
  ('Walking Lunge', 'Long step, drop the back knee toward the floor, drive through the front heel to the next step.'),
  ('Bulgarian Split Squat', 'Rear foot elevated, drop straight down over the front leg. Brutal single-leg quad/glute builder.'),
  ('Standing Calf Raise', 'Full stretch at the bottom, rise onto the toes, pause and squeeze the calves at the top.'),
  ('Hip Thrust', 'Upper back on a bench, drive the hips up, squeeze the glutes hard, chin tucked.'),
  ('Overhead Press', 'Brace the core, press the bar overhead in a straight line, move the head through at lockout.'),
  ('Seated Dumbbell Press', 'Back supported, press the dumbbells overhead without clashing them; controlled descent.'),
  ('Lateral Raise', 'Slight forward lean, raise to shoulder height with a soft elbow, lead with the elbows not the hands.'),
  ('Rear Delt Fly', 'Hinge forward, raise the dumbbells out and back, squeeze the rear delts; keep the traps relaxed.'),
  ('Face Pull', 'Rope to eye level, pull toward the forehead, externally rotate — great for shoulder health.'),
  ('Barbell Curl', 'Elbows pinned to the sides, curl the bar up, squeeze the biceps, lower slowly.'),
  ('Dumbbell Curl', 'Curl and supinate (rotate the pinky up) for a strong biceps peak contraction.'),
  ('Hammer Curl', 'Neutral grip throughout; targets the brachialis and forearms.'),
  ('Triceps Pushdown', 'Elbows tucked, push the bar/rope down to lockout, squeeze the triceps, control the return.'),
  ('Skull Crusher', 'Lying, lower the bar to the forehead by bending only the elbows, then extend.'),
  ('Overhead Triceps Extension', 'Keeps the long head of the triceps under stretch. Lower behind the head, extend overhead.'),
  ('Plank', 'Forearms and toes, body in a straight line, brace the core and glutes; do not let the hips sag.'),
  ('Hanging Leg Raise', 'Hang from a bar, raise the legs with control using the abs, avoid swinging.'),
  ('Cable Crunch', 'Kneel, rope by the head, crunch down by rounding the spine, squeeze the abs.'),
  ('Russian Twist', 'Seated, lean back, rotate the torso side to side; add weight for more challenge.')
) AS v(name, d)
WHERE e.user_id IS NULL AND e.name = v.name;

-- A YouTube "how to" search link for every built-in exercise (robust to renames).
UPDATE exercises
   SET video_url = 'https://www.youtube.com/results?search_query='
                   || replace(lower(name), ' ', '+') || '+proper+form'
 WHERE user_id IS NULL AND (video_url IS NULL OR video_url = '');
