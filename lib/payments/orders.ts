import { addDays, addMonths, addYears } from "date-fns";
import { nanoid } from "nanoid";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AppProfile } from "@/lib/auth";
import type { PlanSlug } from "@/lib/types";
import { productForPlan } from "@/lib/payments/catalog";

export type OrderRecord = {
  id: string;
  order_no: string;
  user_id: string;
  result_id?: string | null;
  product_type: string;
  product_name: string;
  amount_cents: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "CLOSED" | "REFUNDED";
};

export function createOrderNo() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `SH${stamp}${nanoid(12).toUpperCase()}`;
}

export async function createCheckoutOrder({
  profile,
  plan,
  resultId
}: {
  profile: AppProfile;
  plan: PlanSlug;
  resultId?: string | null;
}) {
  const product = await productForPlan(plan);

  if (product.productType === "REPORT_UNLOCK" && !resultId) {
    throw new Error("Missing report id for single report unlock.");
  }

  if (!hasServiceRoleEnv()) {
    throw new Error("支付服务未完成配置：缺少 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const supabase = createSupabaseServiceClient();

  if (product.productType === "REPORT_UNLOCK" && resultId) {
    const { data: result, error: resultError } = await supabase
      .from("results")
      .select("id,user_id,is_unlocked")
      .eq("id", resultId)
      .single();

    if (resultError || !result) {
      throw new Error("Report not found.");
    }

    if (result.user_id !== profile.id && profile.role !== "ADMIN") {
      throw new Error("Forbidden report unlock.");
    }

    if (result.is_unlocked) {
      throw new Error("Report already unlocked.");
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_no: createOrderNo(),
      user_id: profile.id,
      result_id: resultId || null,
      product_type: product.productType,
      product_name: product.productName,
      amount_cents: product.amountCents,
      currency: "CNY",
      status: "PENDING",
      expires_at: addDays(new Date(), 1).toISOString(),
      metadata: { plan }
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create order.");
  }

  return data as OrderRecord;
}

export async function getOrderByNo(orderNo: string) {
  if (!hasServiceRoleEnv()) {
    throw new Error("支付服务未完成配置：缺少 SUPABASE_SERVICE_ROLE_KEY。");
  }
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("order_no", orderNo)
    .single();
  return (data as OrderRecord | null) || null;
}

export async function ensurePaymentRecord({
  order,
  provider,
  providerOrderId
}: {
  order: OrderRecord;
  provider: "WECHAT" | "ALIPAY";
  providerOrderId?: string;
}) {
  if (!hasServiceRoleEnv()) {
    throw new Error("支付服务未完成配置：缺少 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      user_id: order.user_id,
      provider,
      status: "PENDING",
      amount_cents: order.amount_cents,
      provider_order_id: providerOrderId || order.order_no
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create payment.");
  }

  return data;
}

type PaymentServiceClient = ReturnType<typeof createSupabaseServiceClient>;

async function applyPaidOrderEntitlements({
  supabase,
  order,
  now
}: {
  supabase: PaymentServiceClient;
  order: OrderRecord;
  now: Date;
}) {
  if (order.product_type === "MEMBERSHIP_MONTHLY" || order.product_type === "MEMBERSHIP_YEARLY") {
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (!existingMembership) {
      const isMonthly = order.product_type === "MEMBERSHIP_MONTHLY";
      const { error } = await supabase.from("memberships").insert({
        user_id: order.user_id,
        plan: isMonthly ? "MONTHLY" : "YEARLY",
        status: "ACTIVE",
        starts_at: now.toISOString(),
        ends_at: isMonthly ? addMonths(now, 1).toISOString() : addYears(now, 1).toISOString(),
        order_id: order.id
      });

      if (error) {
        throw new Error(error.message || "Failed to activate membership.");
      }
    }
  }

  if (order.product_type === "REPORT_UNLOCK") {
    if (!order.result_id) {
      throw new Error("Missing report id for paid report unlock.");
    }

    const { data, error } = await supabase
      .from("results")
      .update({
        is_unlocked: true,
        access_type: "SINGLE_PURCHASE"
      })
      .eq("id", order.result_id)
      .select("id,is_unlocked")
      .single();

    if (error || !data?.is_unlocked) {
      throw new Error(error?.message || "Failed to unlock report.");
    }
  }
}

export async function activatePaidOrder({
  orderNo,
  provider,
  transactionId,
  rawPayload
}: {
  orderNo: string;
  provider: "WECHAT" | "ALIPAY";
  transactionId?: string;
  rawPayload?: unknown;
}) {
  if (!hasServiceRoleEnv()) {
    throw new Error("支付服务未完成配置：缺少 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const supabase = createSupabaseServiceClient();
  const order = await getOrderByNo(orderNo);
  if (!order) throw new Error("Order not found.");

  const now = new Date();
  let paidOrder = order;

  if (order.status !== "PAID") {
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "PAID",
        paid_at: now.toISOString()
      })
      .eq("id", order.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to mark order as paid.");
    }

    paidOrder = data as OrderRecord;
  }

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "SUCCESS",
      transaction_id: transactionId,
      trade_state: "SUCCESS",
      raw_payload: rawPayload || null
    })
    .eq("order_id", order.id)
    .eq("provider", provider);

  if (paymentError) {
    console.error("Failed to update payment record.", paymentError);
  }

  await applyPaidOrderEntitlements({
    supabase,
    order: paidOrder,
    now
  });

  return {
    ...paidOrder,
    status: "PAID" as const
  };
}
