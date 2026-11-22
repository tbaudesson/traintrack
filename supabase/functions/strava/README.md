# Strava

Connects an athlete's Strava account and brings their activities in as
sessions (`workouts.source = 'strava'`). The Strava tokens stay on the server
(`strava_connections`, no access from devices).

What Strava's API agreement asks, and how the app does it:

- **An athlete's Strava data is shown to that athlete only.** A coach does not
  read a client's sessions from Strava (migration 080 changes the coach's
  reading rule).
- **No Strava data in an AI model.** The assistant's summary leaves the
  sessions from Strava out (`src/lib/coachContext.ts`).
- **Disconnecting deletes the data.** "Disconnect" withdraws the app's access
  on Strava and deletes the sessions that came from it.
- **Attribution.** "Compatible with Strava" in Settings, the "Connect with
  Strava" button in Strava's orange, and a "View on Strava" link on each
  imported session.

## Setup (once)

1. **Migrations 078 and 080** applied.
2. **A Strava API application**, at <https://www.strava.com/settings/api>:
   - *Authorization Callback Domain*: the app's domain, without `https://`
     (e.g. `traintrack-pearsonia-s-projects.vercel.app`). For local tests,
     `localhost` is accepted too.
   - Note the *Client ID* and the *Client Secret*.
   - A new application serves **one athlete** (its owner) until its capacity
     is raised: up to 10 athletes from the same page, beyond that after a
     review by Strava.
3. **Function secrets**, then deploy:

   ```bash
   supabase secrets set STRAVA_CLIENT_ID=<client id> STRAVA_CLIENT_SECRET=<client secret>
   supabase functions deploy strava
   ```

   The function checks the signed-in user's token itself (JWT verification
   left on).

## How it runs

- **Connect** (Settings › Data and account › Strava): off to Strava's page,
  back on `/<locale>/strava`, the code exchanged on the server, then the last
  90 days imported.
- **Import**: when the app opens (every 6 hours at most) and on "Import now".
  Each call reads at most 300 activities. An activity already logged otherwise
  (same sport started within two minutes, or same day, sport and distance) is
  not imported again.
- **Not handled yet**: Strava's webhooks (an activity arrives at the next
  import, not instantly) and a disconnection made on Strava's side (the
  tokens stop working; "Disconnect" in the app then clears them).
