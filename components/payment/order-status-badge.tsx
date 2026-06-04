"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  formatOrderRemaining,
  getOrderRemainingSeconds,
  getOrderStatusLabel,
  isPendingOrderExpired
} from "@/lib/order-status";

export function OrderStatusBadge({
  status,
  expiresAt
}: {
  status?: string | null;
  expiresAt?: string | null;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getOrderRemainingSeconds(expiresAt)
  );

  useEffect(() => {
    if (status !== "PENDING" || !expiresAt) return;

    const tick = () => setRemainingSeconds(getOrderRemainingSeconds(expiresAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, status]);

  const displayStatus =
    status === "PENDING" && (remainingSeconds === 0 || isPendingOrderExpired(status, expiresAt))
      ? "CLOSED"
      : status || "UNKNOWN";

  const variant = displayStatus === "PAID" ? "soft" : "outline";

  return (
    <div className="flex w-fit flex-col items-start gap-1 sm:items-end">
      <Badge className="w-fit" variant={variant}>
        {getOrderStatusLabel(displayStatus)}
      </Badge>
      {displayStatus === "PENDING" && typeof remainingSeconds === "number" ? (
        <span className="text-xs text-muted-foreground">
          {formatOrderRemaining(remainingSeconds)} 后关闭
        </span>
      ) : null}
    </div>
  );
}
