import type { NextRequest, NextResponse } from "next/server";

export const AUTH_SESSION_COOKIE = "soul_house_auth";

export function getFallbackSessionCookieValue(_request: NextRequest) {
  return undefined;
}

export function setFallbackSessionCookie<T extends NextResponse>(response: T) {
  return response;
}

export function clearFallbackSessionCookie<T extends NextResponse>(response: T) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

export async function getFallbackAuthSession() {
  return null;
}
