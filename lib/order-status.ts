export const ORDER_EXPIRE_MINUTES = 15;

export type KnownOrderStatus = "PENDING" | "PAID" | "FAILED" | "CLOSED" | "REFUNDED";

export const ORDER_STATUS_LABELS: Record<KnownOrderStatus, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  FAILED: "支付失败",
  CLOSED: "已关闭",
  REFUNDED: "已退款"
};

export function getOrderStatusLabel(status?: string | null) {
  if (!status) return "未知状态";
  return ORDER_STATUS_LABELS[status as KnownOrderStatus] || status;
}

export function isPendingOrderExpired(status?: string | null, expiresAt?: string | null) {
  if (status !== "PENDING" || !expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function getOrderRemainingSeconds(expiresAt?: string | null) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export function formatOrderRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}
