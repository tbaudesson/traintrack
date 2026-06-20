import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Singleton Supabase browser client.
 *
 * Uses localStorage for session persistence — compatible with PWA/offline-first.
 * The session is automatically refreshed when the token is about to expire.
 *
 * During SSG prerendering on the server, env vars may be absent — we create
 * the client lazily to avoid crashing the build.
 */
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      // During SSG / server build — return a dummy that will never be called
      // at runtime. Pages using Supabase are all "use client" components.
      throw new Error(
        "Supabase env vars are not set. This should only happen during SSG prerendering."
      );
    }
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // handles magic link / OAuth callback
      },
    });
  }
  return _client;
}

/**
 * Lazy-initialized Supabase client.
 * Accessing any property triggers creation — safe during SSG as long as
 * no server-side code actually calls Supabase methods.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
