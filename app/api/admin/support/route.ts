import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") return null;
  return profile;
}

export async function GET(request: Request) {
  const profile = await requireAdmin();
  if (hasSupabaseEnv() && !profile) return noStoreJson({ error: "无权访问" }, 403);

  if (!hasServiceRoleEnv()) {
    return noStoreJson({
      tickets: [],
      error: "当前环境缺少 SUPABASE_SERVICE_ROLE_KEY，无法读取客服后台。"
    });
  }

  const status = new URL(request.url).searchParams.get("status");
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (status && status !== "ALL") query = query.eq("status", status);

  const { data: tickets, error } = await query;
  if (error) return noStoreJson({ error: error.message, tickets: [] }, 400);

  const ticketRows = tickets || [];
  const ticketIds = ticketRows.map((ticket) => ticket.id);
  const userIds = Array.from(
    new Set(ticketRows.map((ticket) => ticket.user_id).filter(Boolean))
  ) as string[];

  const [{ data: messages, error: messageError }, { data: users }] = await Promise.all([
    ticketIds.length
      ? supabase
          .from("support_messages")
          .select("*")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from("users").select("id,email,name").in("id", userIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (messageError) return noStoreJson({ error: messageError.message, tickets: [] }, 400);

  const userMap = new Map((users || []).map((user) => [user.id, user]));
  const messageRows = messages || [];

  return noStoreJson({
    tickets: ticketRows.map((ticket) => {
      const ticketMessages = messageRows.filter((message) => message.ticket_id === ticket.id);
      return {
        ...ticket,
        user: ticket.user_id ? userMap.get(ticket.user_id) || null : null,
        messages: ticketMessages,
        lastMessage: ticketMessages[ticketMessages.length - 1] || null
      };
    })
  });
}
