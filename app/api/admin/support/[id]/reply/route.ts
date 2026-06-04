import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { sanitizeText } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const replySchema = z.object({
  message: z.string().min(1).max(2000),
  status: z.enum(["REPLIED", "RESOLVED"]).default("REPLIED")
});

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return noStoreJson({ error: "无权访问" }, 403);
  }

  if (!profile || profile.role !== "ADMIN") {
    return noStoreJson({ error: "请先使用管理员账号登录" }, 401);
  }

  if (!hasServiceRoleEnv()) {
    return noStoreJson(
      { error: "当前环境缺少 SUPABASE_SERVICE_ROLE_KEY，无法回复客服消息。" },
      400
    );
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const body = replySchema.safeParse(json);
  if (!body.success) return noStoreJson({ error: "回复内容不能为空" }, 400);

  const now = new Date().toISOString();
  const supabase = createSupabaseServiceClient();
  const content = sanitizeText(body.data.message, 2000);

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (ticketError || !ticket) return noStoreJson({ error: "客服工单不存在" }, 404);

  const { error: messageError } = await supabase.from("support_messages").insert({
    ticket_id: id,
    sender: "admin",
    content,
    admin_user_id: profile.id,
    created_at: now
  });

  if (messageError) return noStoreJson({ error: messageError.message }, 400);

  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({
      status: body.data.status,
      last_message_at: now,
      updated_at: now
    })
    .eq("id", id);

  if (updateError) return noStoreJson({ error: updateError.message }, 400);
  return noStoreJson({ ok: true });
}
