import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { hasServiceRoleEnv } from "@/lib/env";
import {
  getPaymentConfig,
  isPaymentChannelProductionReady,
  maskSecret,
  savePaymentConfig
} from "@/lib/payments/config";

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  const config = await getPaymentConfig();
  const mockEnabled = process.env.MOCK_PAYMENT_ENABLED === "true";
  const wechatReady = isPaymentChannelProductionReady(config, "wechat");
  const alipayReady = isPaymentChannelProductionReady(config, "alipay");

  return NextResponse.json({
    canPersist: true,
    storage: hasServiceRoleEnv() ? "database" : "memory",
    channels: [
      {
        id: "wechat",
        name: "微信支付",
        enabled: config.wechat.enabled,
        ready: wechatReady,
        frontVisible: Boolean(config.wechat.enabled && (wechatReady || mockEnabled)),
        mode: config.wechat.enabled
          ? wechatReady
            ? "production"
            : mockEnabled
              ? "mock"
              : "disabled"
          : "disabled",
        callbackUrl: config.wechat.notifyUrl,
        editable: {
          enabled: config.wechat.enabled,
          appid: config.wechat.appid,
          mchid: config.wechat.mchid,
          apiV3Key: "",
          serialNo: config.wechat.serialNo,
          privateKey: "",
          platformPublicKey: "",
          notifyUrl: config.wechat.notifyUrl
        },
        fields: [
          { label: "App ID", configured: Boolean(config.wechat.appid), value: maskSecret(config.wechat.appid) },
          { label: "商户号 MCH ID", configured: Boolean(config.wechat.mchid), value: maskSecret(config.wechat.mchid) },
          { label: "API v3 Key", configured: Boolean(config.wechat.apiV3Key), value: maskSecret(config.wechat.apiV3Key) },
          { label: "商户证书序列号", configured: Boolean(config.wechat.serialNo), value: maskSecret(config.wechat.serialNo) },
          { label: "商户私钥", configured: Boolean(config.wechat.privateKey), value: maskSecret(config.wechat.privateKey) },
          { label: "平台公钥", configured: Boolean(config.wechat.platformPublicKey), value: maskSecret(config.wechat.platformPublicKey) }
        ]
      },
      {
        id: "alipay",
        name: "支付宝",
        enabled: config.alipay.enabled,
        ready: alipayReady,
        frontVisible: Boolean(config.alipay.enabled && (alipayReady || mockEnabled)),
        mode: config.alipay.enabled
          ? alipayReady
            ? "production"
            : mockEnabled
              ? "mock"
              : "disabled"
          : "disabled",
        callbackUrl: config.alipay.notifyUrl,
        editable: {
          enabled: config.alipay.enabled,
          appId: config.alipay.appId,
          privateKey: "",
          publicKey: "",
          notifyUrl: config.alipay.notifyUrl,
          returnUrl: config.alipay.returnUrl,
          gateway: config.alipay.gateway
        },
        fields: [
          { label: "App ID", configured: Boolean(config.alipay.appId), value: maskSecret(config.alipay.appId) },
          { label: "应用私钥", configured: Boolean(config.alipay.privateKey), value: maskSecret(config.alipay.privateKey) },
          { label: "支付宝公钥", configured: Boolean(config.alipay.publicKey), value: maskSecret(config.alipay.publicKey) },
          { label: "Return URL", configured: Boolean(config.alipay.returnUrl), value: config.alipay.returnUrl },
          { label: "Gateway", configured: Boolean(config.alipay.gateway), value: config.alipay.gateway }
        ]
      }
    ]
  });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const config = await savePaymentConfig(payload);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}
