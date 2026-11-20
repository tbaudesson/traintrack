-- 058_injury_guidance.sql
-- How the app follows an injury, kept as data an admin can change (Admin,
-- Injuries tab): when a pain is strong or moderate, how long it is
-- remembered, the loads of the return weeks and when a pain holds them back,
-- when a pain coming back calls for a professional, and the gentle moves
-- offered for each area. They were the app's former fixed values (strong
-- pain from 7/10, return at 70 %, 85 %, then 100 %).
--
-- Deploy: apply this file BEFORE the code: until the app has read them, it
-- follows nothing by itself (no strong-pain alert, no return weeks).
--
-- Safe to re-run: an admin's changes are kept.

INSERT INTO app_settings (key, value) VALUES ('injury_guidance', '
{
  "pain": {
    "severe": 7,
    "moderate": 4,
    "moderateLoad": 0.8,
    "recentDays": 14,
    "coachDays": 7
  },
  "return": {
    "loads": [
      0.7,
      0.85,
      1
    ],
    "holdAbovePain": 2,
    "holdDays": 7
  },
  "persistent": {
    "days": 14,
    "reports": 3,
    "minLevel": 4
  },
  "gentle": {
    "shoulder": [
      "arm-circles",
      "arm-swings",
      "childs-pose"
    ],
    "elbow": [
      "arm-circles",
      "chest-doorway",
      "triceps"
    ],
    "wrist": [
      "arm-circles",
      "biceps-wall"
    ],
    "neck": [
      "cross-shoulder",
      "arm-circles",
      "childs-pose"
    ],
    "upper_back": [
      "cat-cow",
      "childs-pose",
      "arm-swings",
      "torso-twists"
    ],
    "lower_back": [
      "cat-cow",
      "childs-pose",
      "hamstring",
      "glute-bridge"
    ],
    "hip": [
      "glute-bridge",
      "hip-circles",
      "butterfly",
      "hamstring"
    ],
    "knee": [
      "glute-bridge",
      "hamstring",
      "hip-circles",
      "calf"
    ],
    "ankle": [
      "calf",
      "glute-bridge",
      "hamstring",
      "hip-circles"
    ]
  }
}
')
ON CONFLICT (key) DO NOTHING;
