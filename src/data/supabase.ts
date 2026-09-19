import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * A missing public configuration keeps the game completely local. The database
 * password is deliberately never read by the browser or this module.
 */
export const supabase = url && publishableKey
  ? createClient(url, publishableKey, {
      // Shared persistence never signs a visitor in or stores an auth session.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null

export const cloudSyncConfigured = Boolean(supabase)
