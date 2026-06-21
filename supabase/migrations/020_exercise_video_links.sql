-- 020_exercise_video_links.sql
-- First-pass curation: specific, embeddable YouTube form videos for the most
-- common built-in exercises (sourced from live YouTube search, June 2026).
-- These play inline via the VideoEmbed player. The remaining built-ins keep
-- their generic "search YouTube" link until curated (in-app, by an admin).
-- updated_at is bumped so the (clock-skew-fixed) sync engine re-pulls them.

UPDATE exercises e SET video_url = v.url, updated_at = now()
FROM (VALUES
  ('Barbell Bench Press',        'https://www.youtube.com/watch?v=Pp8rHcFVIYg'),
  ('Incline Barbell Bench Press','https://www.youtube.com/watch?v=5kyLUGVq_pk'),
  ('Dumbbell Bench Press',       'https://www.youtube.com/watch?v=5Y3VZsLb1Ys'),
  ('Deadlift',                   'https://www.youtube.com/watch?v=XxWcirHIwVo'),
  ('Barbell Row',                'https://www.youtube.com/watch?v=rqTOAM8WoeM'),
  ('Pull-up',                    'https://www.youtube.com/watch?v=m7NhuSXiQIs'),
  ('Lat Pulldown',               'https://www.youtube.com/watch?v=CAwf7n6Luuc'),
  ('Seated Cable Row',           'https://www.youtube.com/watch?v=7BkgqzC6WsM'),
  ('Back Squat',                 'https://www.youtube.com/watch?v=CWl0apMgshk'),
  ('Front Squat',                'https://www.youtube.com/watch?v=wyDbagKS7Rg'),
  ('Romanian Deadlift',          'https://www.youtube.com/watch?v=7j-2w4-P14I'),
  ('Leg Press',                  'https://www.youtube.com/watch?v=K5n2vg3oZa4'),
  ('Overhead Press',             'https://www.youtube.com/watch?v=F3QY5vMz_6I'),
  ('Lateral Raise',              'https://www.youtube.com/watch?v=Y29xKcze8Ik'),
  ('Barbell Curl',               'https://www.youtube.com/watch?v=pQfJR-sSIvA'),
  ('Triceps Pushdown',           'https://www.youtube.com/watch?v=IoAP0xQtROk'),
  ('Hip Thrust',                 'https://www.youtube.com/watch?v=S_uZP4UH6J0'),
  ('Plank',                      'https://www.youtube.com/watch?v=A2b2EmIg0dA'),
  ('Bulgarian Split Squat',      'https://www.youtube.com/watch?v=hiLF_pF3EJM')
) AS v(name, url)
WHERE e.user_id IS NULL AND e.name = v.name;
