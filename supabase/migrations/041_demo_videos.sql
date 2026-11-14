-- 041_demo_videos.sql
-- Demonstration videos for the exercises of the timed sessions and of the
-- vaulting conditioning: short form videos, checked to exist and to play
-- inline. A link an admin already chose is kept; only empty links and
-- generic YouTube searches are replaced. updated_at is bumped so the sync
-- engine pulls them again.
--
-- Deploy: apply this file, in any order with the code (the app also knows
-- these videos by itself).
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

UPDATE exercises e SET video_url = v.url, updated_at = now()
FROM (VALUES
  ('Burpee', 'https://www.youtube.com/watch?v=NCqbpkoiyXE'),
  ('Bodyweight Squat', 'https://www.youtube.com/watch?v=P-yaD24bUE8'),
  ('Jump Squat', 'https://www.youtube.com/watch?v=BRfxI2Es2lE'),
  ('Mountain Climber', 'https://www.youtube.com/watch?v=cnyTQDSE884'),
  ('Jumping Jack', 'https://www.youtube.com/watch?v=nGaXj3kkmrU'),
  ('High Knees', 'https://www.youtube.com/watch?v=oDdkytliOqE'),
  ('Reverse Lunge', 'https://www.youtube.com/watch?v=xrPteyQLGAo'),
  ('Jumping Lunge', 'https://www.youtube.com/watch?v=FyxFYIV8wKU'),
  ('Skater Jump', 'https://www.youtube.com/watch?v=9_jLW6VkU8A'),
  ('Wall Sit', 'https://www.youtube.com/watch?v=cWTZ8Am1Ee0'),
  ('Inchworm', 'https://www.youtube.com/watch?v=SCJ9qcNPEOQ'),
  ('Plank Shoulder Tap', 'https://www.youtube.com/watch?v=0PrTUpElJ44'),
  ('Bicycle Crunch', 'https://www.youtube.com/watch?v=HWX93vAoLvw'),
  ('Flutter Kicks', 'https://www.youtube.com/watch?v=K5wuM_gNWyw'),
  ('Crunch', 'https://www.youtube.com/watch?v=0t4t3IpiEao'),
  ('Lying Leg Raise', 'https://www.youtube.com/watch?v=JB2oyawG9KI'),
  ('Hollow Hold', 'https://www.youtube.com/watch?v=jLxtFNO0r50'),
  ('Goblet Squat', 'https://www.youtube.com/watch?v=gCESNsDsbqk'),
  ('Dumbbell Thruster', 'https://www.youtube.com/watch?v=1KYPZ-Jzo3w'),
  ('Dumbbell Swing', 'https://www.youtube.com/watch?v=-lcFhjRImQk'),
  ('Renegade Row', 'https://www.youtube.com/watch?v=wTqlJ0aoJlM'),
  ('Dumbbell Romanian Deadlift', 'https://www.youtube.com/watch?v=hQgFixeXdZo'),
  ('Dumbbell Reverse Lunge', 'https://www.youtube.com/watch?v=UoQcIFYTN_o'),
  ('Dumbbell Sumo Squat', 'https://www.youtube.com/watch?v=MwNY25e4QEA'),
  ('Dumbbell Push Press', 'https://www.youtube.com/watch?v=4tCaD42ghlc'),
  ('Dumbbell Woodchop', 'https://www.youtube.com/watch?v=Rf-2l8Z40dg'),
  ('Push-up', 'https://www.youtube.com/watch?v=WDIpL0pjun0'),
  ('Side Plank', 'https://www.youtube.com/watch?v=N_s9em1xTqU'),
  ('Dead Bug', 'https://www.youtube.com/watch?v=GbSC02oU3To'),
  ('Glute Bridge', 'https://www.youtube.com/watch?v=L9KZfxT654Y'),
  ('Russian Twist', 'https://www.youtube.com/watch?v=IJDOoVyVjhc'),
  ('Handstand Hold', 'https://www.youtube.com/watch?v=mVDE6S-ZvRI'),
  ('Single-Leg Balance', 'https://www.youtube.com/watch?v=Dtgh2_LFkBQ'),
  ('Arabesque Hold', 'https://www.youtube.com/watch?v=YoJ9ycg8Txs'),
  ('Superman Hold', 'https://www.youtube.com/watch?v=J9zXkxUAfUA'),
  ('Tuck Jump', 'https://www.youtube.com/watch?v=-bnJGikRGsM'),
  ('Bridge Hold', 'https://www.youtube.com/watch?v=otoDVplyg9w'),
  ('Front Split Stretch', 'https://www.youtube.com/watch?v=KT17i9TdnDM'),
  ('Pike Stretch', 'https://www.youtube.com/watch?v=hD5NGPhyEGc')
) AS v(name, url)
WHERE e.user_id IS NULL AND e.name = v.name
  AND (e.video_url IS NULL OR e.video_url = '' OR e.video_url LIKE '%results?search_query=%');

COMMIT;
