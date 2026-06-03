import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");
  let users: any[] = [];

  if (hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("users")
      .select("id,email,name,role,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    users = data || [];
  }

  return (
      <div className="grid min-w-0 gap-3">
      {users.length ? (
        users.map((user) => (
          <Card key={user.id} className="glass-panel overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{user.name || user.email}</CardTitle>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {user.email} · {formatDate(user.created_at)}
                </p>
              </div>
              <Badge className="w-fit" variant={user.role === "ADMIN" ? "soft" : "outline"}>
                {user.role}
              </Badge>
            </CardHeader>
            <CardContent className="break-all text-sm text-muted-foreground">{user.id}</CardContent>
          </Card>
        ))
      ) : (
        <div className="glass-panel rounded-lg p-8 text-center text-muted-foreground">
          暂无用户
        </div>
      )}
    </div>
  );
}
