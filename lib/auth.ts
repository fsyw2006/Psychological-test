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

export async function getCurrentProfile() {
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
      role: getAdminEmails().includes(user.email.toLowerCase()) ? "ADMIN" : "USER"
    } satisfies AppProfile;
  }

  const service = createSupabaseServiceClient();
  const role = getAdminEmails().includes(user.email.toLowerCase()) ? "ADMIN" : "USER";
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
  return profile as AppProfile;
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
