import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  if (Deno.env.get("MOCK_PAYMENT_ENABLED") !== "true") {
    return jsonResponse({ error: "Mock payment is disabled." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const orderNo = typeof body.orderNo === "string" ? body.orderNo : "";
  if (!orderNo) {
    return jsonResponse({ error: "orderNo is required." }, { status: 400 });
  }

  return jsonResponse({
    ok: true,
    orderNo,
    transactionId: `mock_${Date.now()}`,
    status: "SUCCESS"
  });
});
