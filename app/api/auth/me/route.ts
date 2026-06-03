import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const profile = await getCurrentProfile();

  return NextResponse.json(
    {
      user: profile
        ? {
            id: profile.id,
            authUserId: profile.auth_user_id,
            email: profile.email,
            name: profile.name,
            role: profile.role
          }
        : null
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
