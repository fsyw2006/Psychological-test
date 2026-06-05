import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

export const AUTH_SESSION_COOKIE = "soul_house_auth";

type AuthSessionPayload = {
  accessToken: string;
  refreshToken?: string;
};

type FallbackAuthSession = {
  user: User;
  session?: Session | null;
};

function encodePayload(payload: AuthSessionPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodePayload(value?: string | null): AuthSessionPayload | null {
  if (!value) return null;

  try {
    const payload = JSON.parse(decodeURIComponent(value)) as Partial<AuthSessionPayload>;

    if (typeof payload.accessToken !== "string" || !payload.accessToken) return null;

    return {
      accessToken: payload.accessToken,
      refreshToken: typeof payload.refreshToken === "string" ? payload.refreshToken : undefined
    };
  } catch {
    return null;
  }
}

function getCookieMaxAge(session: Session) {
  if (typeof session.expires_in === "number" && session.expires_in > 60) {
    return session.expires_in;
  }

  return 60 * 60;
}

function getAuthCookieOptions(session?: Session) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session ? getCookieMaxAge(session) : 0
  };
}

export function getFallbackSessionCookieValue(request: NextRequest) {
  return request.cookies.get(AUTH_SESSION_COOKIE)?.value;
}

export function setFallbackSessionCookie<T extends NextResponse>(response: T, session?: Session | null) {
  if (!session?.access_token) return response;

  response.cookies.set(
    AUTH_SESSION_COOKIE,
    encodePayload({
      accessToken: session.access_token,
      refreshToken: session.refresh_token
    }),
    getAuthCookieOptions(session)
  );

  return response;
}

export function clearFallbackSessionCookie<T extends NextResponse>(response: T) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", getAuthCookieOptions());
  return response;
}

export async function getFallbackAuthSession(
  cookieValue?: string | null
): Promise<FallbackAuthSession | null> {
  const payload = decodePayload(cookieValue);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!payload || !url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser(payload.accessToken);

  if (user) {
    return { user };
  }

  if (!payload.refreshToken) return null;

  const { data } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken
  });

  if (!data.user) return null;

  return {
    user: data.user,
    session: data.session
  };
}
