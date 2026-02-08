import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export const createSupabaseClient = (request: Request) => {
  const response = new Response()

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
          )
        },
      },
    }
  )

  return { supabase, response }
}
