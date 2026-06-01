import {
  randomNonce,
  rsaSha256Sign,
  rsaSha256Verify,
  decryptWechatResource
} from "@/lib/payments/crypto";
import { ensurePaymentRecord, type OrderRecord } from "@/lib/payments/orders";
import { getPaymentConfig, type WechatPayConfig } from "@/lib/payments/config";

type WechatResource = {
  associated_data?: string;
  nonce: string;
  ciphertext: string;
};

async function wechatConfig() {
  const config = await getPaymentConfig();
  return config.wechat;
}

function missingWechatFields(config: WechatPayConfig) {
  return [
    ["App ID", config.appid],
    ["商户号 MCH ID", config.mchid],
    ["API v3 Key", config.apiV3Key],
    ["商户证书序列号", config.serialNo],
    ["商户私钥", config.privateKey],
    ["微信平台公钥", config.platformPublicKey],
    ["支付回调地址", config.notifyUrl]
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label);
}

export function assertWechatPaymentReady(config: WechatPayConfig) {
  if (!config.enabled) {
    throw new Error("微信支付通道未启用，请先在后台收款通道填写真实商户参数并启用。");
  }

  const missing = missingWechatFields(config);
  if (missing.length) {
    throw new Error(`微信支付参数未配置完整：${missing.join("、")}`);
  }
}

export async function ensureWechatPaymentReady() {
  const config = await wechatConfig();
  assertWechatPaymentReady(config);
  return config;
}

async function buildWechatAuthorization({
  method,
  url,
  body,
  config
}: {
  method: string;
  url: URL;
  body: string;
  config: WechatPayConfig;
}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomNonce();
  const urlPath = `${url.pathname}${url.search}`;
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = await rsaSha256Sign(message, config.privateKey);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

export async function createWechatNativePayment(order: OrderRecord) {
  const config = await ensureWechatPaymentReady();

  await ensurePaymentRecord({
    order,
    provider: "WECHAT",
    providerOrderId: order.order_no
  });

  const endpoint = new URL("https://api.mch.weixin.qq.com/v3/pay/transactions/native");
  const body = JSON.stringify({
    appid: config.appid,
    mchid: config.mchid,
    description: order.product_name,
    out_trade_no: order.order_no,
    notify_url: config.notifyUrl,
    amount: {
      total: order.amount_cents,
      currency: "CNY"
    }
  });
  const authorization = await buildWechatAuthorization({
    method: "POST",
    url: endpoint,
    body,
    config
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Failed to create WeChat payment.");
  }

  return {
    provider: "WECHAT",
    mode: "native",
    codeUrl: payload.code_url as string
  };
}

export async function parseWechatCallback(body: {
  resource?: WechatResource;
  event_type?: string;
}) {
  const config = await wechatConfig();
  assertWechatPaymentReady(config);

  if (!body.resource) {
    throw new Error("Invalid WeChat callback resource.");
  }

  const plainText = await decryptWechatResource({
    apiV3Key: config.apiV3Key,
    associatedData: body.resource.associated_data,
    nonce: body.resource.nonce,
    ciphertext: body.resource.ciphertext
  });
  const payload = JSON.parse(plainText) as {
    out_trade_no: string;
    transaction_id?: string;
    trade_state?: string;
  };

  return payload;
}

export async function verifyWechatCallbackSignature({
  body,
  timestamp,
  nonce,
  signature
}: {
  body: string;
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
}) {
  const config = await wechatConfig();
  if (!config.enabled || !config.platformPublicKey) return false;
  if (!timestamp || !nonce || !signature) return false;
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  return rsaSha256Verify(message, signature, config.platformPublicKey);
}

export async function queryWechatOrder(orderNo: string) {
  let config: WechatPayConfig;
  try {
    config = await ensureWechatPaymentReady();
  } catch (error) {
    return {
      tradeState: "DISABLED",
      orderNo,
      message: error instanceof Error ? error.message : "微信支付通道未启用"
    };
  }

  const endpoint = new URL(
    `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderNo}`
  );
  endpoint.searchParams.set("mchid", config.mchid);
  const authorization = await buildWechatAuthorization({
    method: "GET",
    url: endpoint,
    body: "",
    config
  });
  const response = await fetch(endpoint, {
    headers: {
      Authorization: authorization,
      Accept: "application/json"
    }
  });
  const payload = await response.json();
  return {
    tradeState: payload.trade_state || "UNKNOWN",
    orderNo
  };
}
