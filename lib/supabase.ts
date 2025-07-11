import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client for admin operations (e.g., inviting users)
export function createServerClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnb3d6bnl6c2p4eXl0ZXhxbXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE0OTY2MSwiZXhwIjoyMDY3NzI1NjYxfQ.wUKG8L6sLOtcUbULHrQfZNIY5z8ubYVGB5z16d9m4hY')
}
