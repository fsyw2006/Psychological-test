import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile, type AppProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { rateLimited, sanitizeText } from "@/lib/security";
import { supportTopicKeys, type SupportTopic } from "@/lib/support";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportTicket = {
  id: string;
  user_id: string | null;
  visitor_id: string | null;
  topic: SupportTopic;
  contact_name: string | null;
  contact_value: string | null;
  status: "OPEN" | "REPLIED" | "RESOLVED";
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

const messageSchema = z.object({
  ticketId: z.string().uuid().optional().nullable(),
  visitorId: z.string().min(8).max(120).optional().nullable(),
  topic: z.enum(supportTopicKeys).default("other"),
  contactName: z.string().max(120).optional().nullable(),
  contact: z.string().max(200).optional().nullable(),
  message: z.string().min(1).max(2000)
});

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

function supportUnavailable() {
  return noStoreJson(
    {
      error:
        "客服后台数据库还没有配置。请确认 Cloudflare 已添加 SUPABASE_SERVICE_ROLE_KEY，并在 Supabase SQL Editor 执行 supabase/support.sql。"
    },
    503
  );
}

function canReadTicket(
  ticket: Pick<SupportTicket, "user_id" | "visitor_id">,
  profile: AppProfile | null,
  visitorId?: string | null
) {
  if (profile?.role === "ADMIN") return true;
  if (profile?.id && ticket.user_id === profile.id) return true;
  return Boolean(visitorId && ticket.visitor_id === visitorId);
}

async function loadTicketMessages(ticketId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

async function findTicket({
  ticketId,
  profile,
  visitorId
}: {
  ticketId?: string | null;
  profile: AppProfile | null;
  visitorId?: string | null;
}) {
  if (!hasServiceRoleEnv()) return null;

  const supabase = createSupabaseServiceClient();
  let ticket: SupportTicket | null = null;

  if (ticketId) {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    ticket = (data as SupportTicket | null) || null;
  } else if (profile?.id) {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", profile.id)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    ticket = (data as SupportTicket | null) || null;
  }

  if (!ticket) return null;
  return canReadTicket(ticket, profile, visitorId) ? ticket : null;
}

export async function GET(request: NextRequest) {
  if (!hasServiceRoleEnv()) return supportUnavailable();

  const profile = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticketId");
  const visitorId = sanitizeText(searchParams.get("visitorId"), 120);

  try {
    const ticket = await findTicket({
      ticketId,
      profile,
      visitorId
    });

    if (!ticket) return noStoreJson({ ticket: null, messages: [] });
    const messages = await loadTicketMessages(ticket.id);
    return noStoreJson({ ticket, messages });
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : "读取客服消息失败" },
      400
    );
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "support-message");
  if (limited) return limited;
  if (!hasServiceRoleEnv()) return supportUnavailable();

  const json = await request.json().catch(() => null);
  const body = messageSchema.safeParse(json);
  if (!body.success) {
    return noStoreJson({ error: "客服消息参数错误" }, 400);
  }

  const profile = await getCurrentProfile();
  const visitorId = sanitizeText(body.data.visitorId, 120);
  if (!profile && !visitorId) {
    return noStoreJson({ error: "当前浏览器缺少客服会话标识，请刷新页面后再试。" }, 400);
  }

  const message = sanitizeText(body.data.message, 2000);
  const contactName = sanitizeText(body.data.contactName, 120);
  const contactValue = sanitizeText(body.data.contact, 200);
  const now = new Date().toISOString();
  const supabase = createSupabaseServiceClient();

  try {
    let ticket = await findTicket({
      ticketId: body.data.ticketId,
      profile,
      visitorId
    });

    if (!ticket) {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: profile?.id || null,
          visitor_id: visitorId || null,
          topic: body.data.topic,
          contact_name: contactName || null,
          contact_value: contactValue || null,
          status: "OPEN",
          last_message_at: now,
          updated_at: now
        })
        .select("*")
        .single();

      if (error || !data) throw new Error(error?.message || "创建客服工单失败");
      ticket = data as SupportTicket;
    } else {
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          user_id: ticket.user_id || profile?.id || null,
          visitor_id: ticket.visitor_id || visitorId || null,
          topic: body.data.topic,
          contact_name: contactName || ticket.contact_name,
          contact_value: contactValue || ticket.contact_value,
          status: "OPEN",
          last_message_at: now,
          updated_at: now
        })
        .eq("id", ticket.id)
        .select("*")
        .single();

      if (error || !data) throw new Error(error?.message || "更新客服工单失败");
      ticket = data as SupportTicket;
    }

    const { error: messageError } = await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender: "user",
      content: message,
      created_at: now
    });

    if (messageError) throw new Error(messageError.message);
    const messages = await loadTicketMessages(ticket.id);
    return noStoreJson({ ok: true, ticket, messages });
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : "发送客服消息失败" },
      400
    );
  }
}
