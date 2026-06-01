import { absoluteUrl } from "@/lib/utils";
import type { OrderRecord } from "@/lib/payments/orders";

export type MockPaymentProvider = "WECHAT" | "ALIPAY";

export function isMockPaymentEnabled() {
  return process.env.MOCK_PAYMENT_ENABLED === "true";
}

export function createMockPayment(order: OrderRecord, provider: MockPaymentProvider) {
  return {
    mock: true,
    provider,
    orderNo: order.order_no,
    codeUrl: absoluteUrl(
      `/checkout/success?mock=1&provider=${provider.toLowerCase()}&orderNo=${encodeURIComponent(
        order.order_no
      )}`
    )
  };
}
