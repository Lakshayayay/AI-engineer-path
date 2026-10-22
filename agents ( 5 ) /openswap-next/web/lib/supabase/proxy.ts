import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "../env";
import type { Database } from "./database.types";

// Pages a signed-out visitor may open. Everything else under pages needs a login.
const OPEN_PATHS = ["/login", "/auth"];

// Runs on every page request: refresh the login cookie, then keep signed-out visitors on the login screen.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getEnv();
  let response = NextResponse.next({ request });

  // Read cookies from the request, and write refreshed ones onto both the request and the response.
  const supabase = createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims checks the token's signature and refreshes it if it expired, so a forged cookie never counts as signed in.
  const { data } = await supabase.auth.getClaims();

  if (!shouldRedirectToLogin(request.nextUrl.pathname, Boolean(data))) return response;

  const redirect = NextResponse.redirect(new URL("/login", request.url));
  // Keep any cookie Supabase just changed, such as clearing a bad token.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

// API routes are skipped: they answer 401 themselves, so a fetch gets JSON, not the login page's HTML.
export function shouldRedirectToLogin(pathname: string, isSignedIn: boolean): boolean {
  if (isSignedIn) return false;
  if (isUnderPath(pathname, "/api")) return false;

  return !OPEN_PATHS.some((openPath) => isUnderPath(pathname, openPath));
}

// "/auth" and "/auth/callback" are under "/auth", but "/authors" is not.
function isUnderPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}
