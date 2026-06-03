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
    return {
      id: `demo_${nanoid(8)}`,
      order_no: createOrderNo(),
      user_id: profile.id,
      result_id: resultId || null,
      product_type: product.productType,
      product_name: product.productName,
      amount_cents: product.amountCents,
      currency: "CNY",
      status: "PENDING"
    } satisfies OrderRecord;
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
  if (!hasServiceRoleEnv()) return null;
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
    return {
      id: `demo_pay_${nanoid(8)}`,
      provider,
      status: "PENDING"
    };
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
  if (!hasServiceRoleEnv()) return null;

  const supabase = createSupabaseServiceClient();
  const order = await getOrderByNo(orderNo);
  if (!order) throw new Error("Order not found.");

  if (order.status === "PAID") return order;

  const now = new Date();
  await supabase
    .from("orders")
    .update({
      status: "PAID",
      paid_at: now.toISOString()
    })
    .eq("id", order.id);

  await supabase
    .from("payments")
    .update({
      status: "SUCCESS",
      transaction_id: transactionId,
      trade_state: "SUCCESS",
      raw_payload: rawPayload || null
    })
    .eq("order_id", order.id)
    .eq("provider", provider);

  if (order.product_type === "MEMBERSHIP_MONTHLY") {
    await supabase.from("memberships").insert({
      user_id: order.user_id,
      plan: "MONTHLY",
      status: "ACTIVE",
      starts_at: now.toISOString(),
      ends_at: addMonths(now, 1).toISOString(),
      order_id: order.id
    });
  }

  if (order.product_type === "MEMBERSHIP_YEARLY") {
    await supabase.from("memberships").insert({
      user_id: order.user_id,
      plan: "YEARLY",
      status: "ACTIVE",
      starts_at: now.toISOString(),
      ends_at: addYears(now, 1).toISOString(),
      order_id: order.id
    });
  }

  if (order.product_type === "REPORT_UNLOCK" && order.result_id) {
    await supabase
      .from("results")
      .update({
        is_unlocked: true,
        access_type: "SINGLE_PURCHASE"
      })
      .eq("id", order.result_id);
  }

  return {
    ...order,
    status: "PAID" as const
  };
}
