import {
  canonicalQuery,
  randomNonce,
  rsaSha256Sign,
  rsaSha256Verify
} from "@/lib/payments/crypto";
import { ensurePaymentRecord, type OrderRecord } from "@/lib/payments/orders";
import { getPaymentConfig } from "@/lib/payments/config";

async function alipayConfig() {
  const config = await getPaymentConfig();
  return config.alipay;
}

function missingAlipayFields(config: Awaited<ReturnType<typeof alipayConfig>>) {
  return [
    ["App ID", config.appId],
    ["应用私钥", config.privateKey],
    ["支付宝公钥", config.publicKey],
    ["异步回调地址", config.notifyUrl],
    ["支付完成返回地址", config.returnUrl],
    ["支付宝网关", config.gateway]
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label);
}

export function assertAlipayPaymentReady(config: Awaited<ReturnType<typeof alipayConfig>>) {
  if (!config.enabled) {
    throw new Error("支付宝通道未启用，请先在后台收款通道填写真实应用参数并启用。");
  }

  const missing = missingAlipayFields(config);
  if (missing.length) {
    throw new Error(`支付宝参数未配置完整：${missing.join("、")}`);
  }
}

export async function ensureAlipayPaymentReady() {
  const config = await alipayConfig();
  assertAlipayPaymentReady(config);
  return config;
}

function formatAlipayTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function createAlipayPagePayment(order: OrderRecord) {
  const config = await ensureAlipayPaymentReady();

  await ensurePaymentRecord({
    order,
    provider: "ALIPAY",
    providerOrderId: order.order_no
  });

  const params: Record<string, string> = {
    app_id: config.appId,
    method: "alipay.trade.page.pay",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatAlipayTime(new Date()),
    version: "1.0",
    notify_url: config.notifyUrl,
    return_url: `${config.returnUrl}?orderNo=${order.order_no}`,
    biz_content: JSON.stringify({
      out_trade_no: order.order_no,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: (order.amount_cents / 100).toFixed(2),
      subject: order.product_name,
      passback_params: randomNonce(8)
    })
  };
  const signContent = canonicalQuery(params, { includeSignType: true });
  params.sign = await rsaSha256Sign(signContent, config.privateKey);

  return {
    provider: "ALIPAY",
    mode: "page",
    paymentUrl: `${config.gateway}?${new URLSearchParams(params).toString()}`
  };
}

export async function verifyAlipayCallback(form: Record<string, string>) {
  const config = await alipayConfig();
  assertAlipayPaymentReady(config);

  const { sign, sign_type: _signType, ...rest } = form;
  if (!sign) return false;
  return rsaSha256Verify(canonicalQuery(rest), sign, config.publicKey);
}
