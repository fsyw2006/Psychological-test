import { redirect } from "next/navigation";
import { getAdminEmails, hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient
} from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  auth_user_id?: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  role: "USER" | "ADMIN";
};

function isAdminEmail(email: string) {
  return getAdminEmails().includes(email.toLowerCase());
}

export async function getCurrentProfile() {
  try {
    if (!hasSupabaseEnv()) return null;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user?.email) return null;

    if (!hasServiceRoleEnv()) {
      return {
        id: user.id,
        auth_user_id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split("@")[0],
        avatar_url: user.user_metadata?.avatar_url || null,
        role: isAdminEmail(user.email) ? "ADMIN" : "USER"
      } satisfies AppProfile;
    }

    const service = createSupabaseServiceClient();
    const { data: existingProfile } = await service
      .from("users")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    let alreadyAdmin = existingProfile?.role === "ADMIN";

    if (!alreadyAdmin && existingProfile?.id) {
      const { data: adminRow } = await service
        .from("admins")
        .select("id")
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      alreadyAdmin = Boolean(adminRow);
    }

    const role = alreadyAdmin || isAdminEmail(user.email) ? "ADMIN" : "USER";
    const { data: profile, error: profileError } = await service
      .from("users")
      .upsert(
        {
          auth_user_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url || null,
          role
        },
        {
          onConflict: "auth_user_id"
        }
      )
      .select("id, auth_user_id, email, name, avatar_url, role")
      .single();

    if (profileError || !profile) return null;

    if (profile.role === "ADMIN") {
      await service.from("admins").upsert(
        {
          user_id: profile.id,
          permissions: ["*"],
          active: true
        },
        {
          onConflict: "user_id"
        }
      );
    }

    return profile as AppProfile;
  } catch (error) {
    console.error("Failed to read current Supabase profile", error);
    return null;
  }
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  return profile;
}

export async function requireAdminProfile() {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") redirect("/account");
  return profile;
}
