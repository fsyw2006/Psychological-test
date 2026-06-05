import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getFallbackAuthSession,
  getFallbackSessionCookieValue,
  setFallbackSessionCookie
} from "@/lib/auth-session-cookie";

type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: any;
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return withSecurityHeaders(response);
  }

  const pathname = request.nextUrl.pathname;
  const isProtected = pathname.startsWith("/account") || pathname.startsWith("/admin");

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    let authUser = user;

    if (error || !authUser) {
      const fallbackSession = await getFallbackAuthSession(getFallbackSessionCookieValue(request));
      authUser = fallbackSession?.user ?? null;

      if (fallbackSession?.session) {
        response = setFallbackSessionCookie(response, fallbackSession.session);
      }
    }

    if (isProtected && !authUser) {
      return redirectToLogin(request, pathname);
    }

    return withSecurityHeaders(response);
  } catch (error) {
    console.error("Failed to update Supabase session", error);
    if (isProtected) {
      return redirectToLogin(request, pathname);
    }
    return withSecurityHeaders(response);
  }
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth/login";
  redirectUrl.searchParams.set("next", pathname);
  return withSecurityHeaders(NextResponse.redirect(redirectUrl));
}
