import { notFound } from "next/navigation";
import { getAiSettings } from "@/lib/ai-settings";

export default async function ChatPage() {
  const settings = await getAiSettings();
  if (!settings.aiChatEnabled) notFound();

  return (
    <section className="section-shell">
      <div className="glass-panel mx-auto max-w-2xl rounded-lg p-8 text-center">
        <p className="eyebrow">AI 心理陪伴</p>
        <h1 className="mobile-title mt-2">AI 聊天功能已开启</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          当前为预留入口。正式上线前请在后台完成服务商、模型、API Key 和安全提示词配置。
        </p>
      </div>
    </section>
  );
}
