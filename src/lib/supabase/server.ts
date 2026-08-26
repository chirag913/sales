import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client for Server Components, Route Handlers, and proxy.ts.
// A new client is created per request per Supabase's SSR guidance — it's cheap
// and keeps cookie handling scoped to the current request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render, where cookies can't be set.
            // Safe to ignore as long as proxy.ts is refreshing sessions on navigation.
          }
        },
      },
    }
  );
}
