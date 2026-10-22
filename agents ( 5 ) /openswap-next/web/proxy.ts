import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 calls this before each matched request (it replaces the old middleware.ts).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files and images, which never need a login check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
