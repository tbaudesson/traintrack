-- 083_music_apps.sql
-- Music during a session: the app opens the athlete's own music app (on a
-- playlist, when one was given) and the session goes on meanwhile.
--   - app_settings.music_apps: the apps one can choose, editable in
--     Admin > Music: how each opens on a phone (its own address), on a
--     computer (its web player), and how its playlist links begin.
-- The athlete's choice stays on the device (another may have another app):
-- no column added. Plain quotes only; safe to run again (an existing value
-- is kept).

INSERT INTO app_settings (key, value) VALUES ('music_apps', '
[
  {
    "id": "spotify",
    "name": "Spotify",
    "appUrl": "spotify:",
    "webUrl": "https://open.spotify.com",
    "playlistPrefixes": ["https://open.spotify.com/", "https://spotify.link/"]
  },
  {
    "id": "apple-music",
    "name": "Apple Music",
    "appUrl": "music://",
    "webUrl": "https://music.apple.com",
    "playlistPrefixes": ["https://music.apple.com/"]
  },
  {
    "id": "deezer",
    "name": "Deezer",
    "appUrl": "deezer://",
    "webUrl": "https://www.deezer.com",
    "playlistPrefixes": ["https://www.deezer.com/", "https://link.deezer.com/", "https://deezer.page.link/"]
  },
  {
    "id": "youtube-music",
    "name": "YouTube Music",
    "appUrl": "youtubemusic://",
    "webUrl": "https://music.youtube.com",
    "playlistPrefixes": ["https://music.youtube.com/"]
  },
  {
    "id": "qobuz",
    "name": "Qobuz",
    "appUrl": "qobuzapp://",
    "webUrl": "https://play.qobuz.com",
    "playlistPrefixes": ["https://open.qobuz.com/", "https://play.qobuz.com/", "https://www.qobuz.com/"]
  },
  {
    "id": "musi",
    "name": "Musi",
    "appUrl": "musi://",
    "webUrl": "https://feelthemusi.com",
    "playlistPrefixes": ["https://feelthemusi.com/"]
  }
]
')
ON CONFLICT (key) DO NOTHING;
