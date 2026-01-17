import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates an admin Supabase client that bypasses RLS.
 * Use this for server-side operations that need to access data
 * regardless of RLS policies (e.g., public share pages).
 *
 * IMPORTANT: Never expose this client to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
