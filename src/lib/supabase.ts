import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// When no env vars are configured the app runs 100% on mock data.
// Drop VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY into a .env file to go live.
export const supabase =
  url && anon ? createClient(url, anon) : null

export const isLive = supabase !== null
