import { redirect } from "next/navigation";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings, maskAiKey } from "@/lib/ai-settings";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  const settings = await getAiSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">系统设置</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          AI 聊天为隐藏预留功能，默认关闭；开启后才会显示入口并允许访问接口。
        </p>
      </div>
      <AiSettingsForm
        initialSettings={{
          ...settings,
          aiApiKey: "",
          aiApiKeyMasked: maskAiKey(settings.aiApiKey)
        }}
        storage={hasServiceRoleEnv() ? "database" : "memory"}
      />
    </div>
  );
}
