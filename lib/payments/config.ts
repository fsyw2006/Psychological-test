import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export type WechatPayConfig = {
  enabled: boolean;
  appid: string;
  mchid: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
  platformPublicKey: string;
  notifyUrl: string;
};

export type AlipayConfig = {
  enabled: boolean;
  appId: string;
  privateKey: string;
  publicKey: string;
  notifyUrl: string;
  returnUrl: string;
  gateway: string;
};

export type PaymentRuntimeConfig = {
  wechat: WechatPayConfig;
  alipay: AlipayConfig;
};

export type PaymentChannelId = "wechat" | "alipay";

export type PublicPaymentChannel = {
  id: PaymentChannelId;
  name: string;
  mode: "production" | "mock";
};

export type PaymentConfigInput = {
  wechat?: Partial<WechatPayConfig>;
  alipay?: Partial<AlipayConfig>;
};

const CONFIG_KEY = "payment_channels";
let memoryStoredConfig: Partial<PaymentRuntimeConfig> | null = null;
const SENSITIVE_KEYS = new Set([
  "apiV3Key",
  "privateKey",
  "platformPublicKey",
  "publicKey"
]);

function envConfig(): PaymentRuntimeConfig {
  return {
    wechat: {
      enabled: process.env.WECHAT_PAY_ENABLED === "true",
      appid: process.env.WECHAT_APP_ID || "",
      mchid: process.env.WECHAT_MCH_ID || "",
      apiV3Key: process.env.WECHAT_API_V3_KEY || "",
      serialNo: process.env.WECHAT_SERIAL_NO || "",
      privateKey: process.env.WECHAT_PRIVATE_KEY || "",
      platformPublicKey: process.env.WECHAT_PLATFORM_PUBLIC_KEY || "",
      notifyUrl:
        process.env.WECHAT_NOTIFY_URL || absoluteUrl("/api/payments/wechat/callback")
    },
    alipay: {
      enabled: process.env.ALIPAY_ENABLED === "true",
      appId: process.env.ALIPAY_APP_ID || "",
      privateKey: process.env.ALIPAY_PRIVATE_KEY || "",
      publicKey: process.env.ALIPAY_PUBLIC_KEY || "",
      notifyUrl:
        process.env.ALIPAY_NOTIFY_URL || absoluteUrl("/api/payments/alipay/callback"),
      returnUrl: process.env.ALIPAY_RETURN_URL || absoluteUrl("/checkout/success"),
      gateway: process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do"
    }
  };
}

function mergeConfig(
  base: PaymentRuntimeConfig,
  stored?: Partial<PaymentRuntimeConfig>
): PaymentRuntimeConfig {
  return {
    wechat: {
      ...base.wechat,
      ...(stored?.wechat || {})
    },
    alipay: {
      ...base.alipay,
      ...(stored?.alipay || {})
    }
  };
}

function textToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function cryptoKey() {
  const secret = process.env.PAYMENT_CONFIG_SECRET;
  if (!secret) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(value: string) {
  if (!value) return value;
  const key = await cryptoKey();
  if (!key) return value;

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    new TextEncoder().encode(value)
  );

  return `enc:v1:${textToBase64(iv)}:${textToBase64(new Uint8Array(encrypted))}`;
}

async function decryptSecret(value: unknown) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("enc:v1:")) return value;
  const key = await cryptoKey();
  if (!key) return "";

  const [, , ivBase64, encryptedBase64] = value.split(":");
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(ivBase64)
    },
    key,
    base64ToBytes(encryptedBase64)
  );

  return new TextDecoder().decode(decrypted);
}

async function hydrateSecrets<T extends Record<string, unknown>>(config: T) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    next[key] = SENSITIVE_KEYS.has(key) ? await decryptSecret(value) : value;
  }
  return next as T;
}

async function serializeSecrets<T extends Record<string, unknown>>(config: T) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    next[key] =
      SENSITIVE_KEYS.has(key) && typeof value === "string"
        ? await encryptSecret(value)
        : value;
  }
  return next as T;
}

async function loadStoredConfig() {
  if (!hasServiceRoleEnv()) return memoryStoredConfig;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("system_configs")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (!data?.value) return null;
  const raw = data.value as Partial<PaymentRuntimeConfig>;

  return {
    wechat: raw.wechat
      ? await hydrateSecrets(raw.wechat as unknown as Record<string, unknown>)
      : undefined,
    alipay: raw.alipay
      ? await hydrateSecrets(raw.alipay as unknown as Record<string, unknown>)
      : undefined
  } as Partial<PaymentRuntimeConfig>;
}

export async function getPaymentConfig() {
  return mergeConfig(envConfig(), (await loadStoredConfig()) || undefined);
}

export function hasProductionPaymentChannel(config: PaymentRuntimeConfig) {
  return (
    isPaymentChannelProductionReady(config, "wechat") ||
    isPaymentChannelProductionReady(config, "alipay")
  );
}

export function isPaymentChannelEnabled(
  config: PaymentRuntimeConfig,
  channel: PaymentChannelId
) {
  return channel === "wechat" ? Boolean(config.wechat.enabled) : Boolean(config.alipay.enabled);
}

export function isPaymentChannelProductionReady(
  config: PaymentRuntimeConfig,
  channel: PaymentChannelId
) {
  if (!isPaymentChannelEnabled(config, channel)) return false;

  if (channel === "wechat") {
    return Boolean(
      config.wechat.appid &&
        config.wechat.mchid &&
        config.wechat.apiV3Key &&
        config.wechat.serialNo &&
        config.wechat.privateKey &&
        config.wechat.platformPublicKey &&
        config.wechat.notifyUrl
    );
  }

  return Boolean(
    config.alipay.appId &&
      config.alipay.privateKey &&
      config.alipay.publicKey &&
      config.alipay.notifyUrl &&
      config.alipay.returnUrl &&
      config.alipay.gateway
  );
}

export function shouldUseMockPayment(
  config: PaymentRuntimeConfig,
  channel: PaymentChannelId
) {
  return (
    process.env.MOCK_PAYMENT_ENABLED === "true" &&
    isPaymentChannelEnabled(config, channel) &&
    !isPaymentChannelProductionReady(config, channel)
  );
}

export async function getPublicPaymentChannels() {
  const config = await getPaymentConfig();
  const productionChannels: PublicPaymentChannel[] = [];

  if (config.wechat.enabled) {
    if (isPaymentChannelProductionReady(config, "wechat")) {
      productionChannels.push({ id: "wechat", name: "微信支付", mode: "production" });
    } else if (process.env.MOCK_PAYMENT_ENABLED === "true") {
      productionChannels.push({ id: "wechat", name: "微信支付", mode: "mock" });
    }
  }

  if (config.alipay.enabled) {
    if (isPaymentChannelProductionReady(config, "alipay")) {
      productionChannels.push({ id: "alipay", name: "支付宝支付", mode: "production" });
    } else if (process.env.MOCK_PAYMENT_ENABLED === "true") {
      productionChannels.push({ id: "alipay", name: "支付宝支付", mode: "mock" });
    }
  }

  if (productionChannels.length) return productionChannels;

  return [] satisfies PublicPaymentChannel[];
}

export async function savePaymentConfig(input: PaymentConfigInput) {
  const current = await getPaymentConfig();
  const mergeChannel = <T extends Record<string, unknown>>(
    base: T,
    patch?: Partial<T>
  ) => {
    const next = { ...base };
    for (const [key, value] of Object.entries(patch || {})) {
      if (SENSITIVE_KEYS.has(key) && value === "") continue;
      next[key as keyof T] = value as T[keyof T];
    }
    return next;
  };

  const merged: PaymentRuntimeConfig = {
    wechat: mergeChannel(
      current.wechat as unknown as Record<string, unknown>,
      input.wechat as unknown as Record<string, unknown>
    ) as unknown as WechatPayConfig,
    alipay: mergeChannel(
      current.alipay as unknown as Record<string, unknown>,
      input.alipay as unknown as Record<string, unknown>
    ) as unknown as AlipayConfig
  };

  const stored = {
    wechat: await serializeSecrets(merged.wechat as unknown as Record<string, unknown>),
    alipay: await serializeSecrets(merged.alipay as unknown as Record<string, unknown>)
  };

  if (!hasServiceRoleEnv()) {
    memoryStoredConfig = merged;
    return merged;
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("system_configs").upsert(
    {
      key: CONFIG_KEY,
      value: stored,
      description: "后台收款通道配置"
    },
    {
      onConflict: "key"
    }
  );

  if (error) throw new Error(error.message);
  return merged;
}

export function maskSecret(value?: string) {
  if (!value) return null;
  if (value.includes("PRIVATE KEY") || value.includes("PUBLIC KEY")) return "已配置";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
