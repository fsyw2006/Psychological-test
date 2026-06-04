import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/ai/chat-panel";
import { getAiSettings } from "@/lib/ai-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChatPage() {
  const settings = await getAiSettings();
  if (!settings.aiChatEnabled) notFound();

  return (
    <ChatPanel
      provider={settings.aiProvider}
      model={settings.aiModel}
      freeLimit={settings.freeChatLimit}
      memberLimit={settings.memberChatLimit}
    />
  );
}
