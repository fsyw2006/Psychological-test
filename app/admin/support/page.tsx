import { redirect } from "next/navigation";
import { SupportInbox } from "@/components/admin/support-inbox";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSupportPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  let tickets: any[] = [];
  let supportError = "";

  if (hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data: ticketRows, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (ticketError) {
      supportError = `${ticketError.message}。请先在 Supabase SQL Editor 执行 supabase/support.sql。`;
    }

    const rows = ticketRows || [];
    const ticketIds = rows.map((ticket) => ticket.id);
    const userIds = Array.from(
      new Set(rows.map((ticket) => ticket.user_id).filter(Boolean))
    ) as string[];

    const [{ data: messageRows }, { data: users }] = await Promise.all([
      ticketIds.length
        ? supabase
            .from("support_messages")
            .select("*")
            .in("ticket_id", ticketIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase.from("users").select("id,email,name").in("id", userIds)
        : Promise.resolve({ data: [] })
    ]);

    const userMap = new Map((users || []).map((user) => [user.id, user]));
    const messages = messageRows || [];
    tickets = rows.map((ticket) => {
      const ticketMessages = messages.filter((message) => message.ticket_id === ticket.id);
      return {
        ...ticket,
        user: ticket.user_id ? userMap.get(ticket.user_id) || null : null,
        messages: ticketMessages,
        lastMessage: ticketMessages[ticketMessages.length - 1] || null
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">客服后台</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          查看用户从在线客服页提交的问题、联系方式和问题类型，并直接回复。用户回到客服页后会看到后台回复。
        </p>
      </div>
      {!hasServiceRoleEnv() ? (
        <div className="glass-panel rounded-lg p-4 text-sm leading-6 text-muted-foreground">
          当前环境缺少 SUPABASE_SERVICE_ROLE_KEY，无法读取客服工单。线上部署时请确认 Cloudflare
          Secret 已配置，并先在 Supabase SQL Editor 执行 supabase/support.sql。
        </div>
      ) : null}
      {supportError ? (
        <div className="glass-panel rounded-lg p-4 text-sm leading-6 text-destructive">
          {supportError}
        </div>
      ) : null}
      <SupportInbox initialTickets={tickets} />
    </div>
  );
}
