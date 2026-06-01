"use client";

import { useState, type FormEvent } from "react";
import { Crown, Loader2, Save, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

type MembershipRow = {
  id: string;
  plan: string;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  users?: {
    email?: string;
    name?: string | null;
  } | null;
};

export function MembershipAdminPanel({
  initialMemberships
}: {
  initialMemberships: MembershipRow[];
}) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("MONTHLY");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    const response = await fetch("/api/admin/memberships");
    const data = await response.json();
    setMemberships(data.memberships || []);
  }

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", email, plan })
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? "会员已开通" : data.error || "操作失败");
    if (response.ok) {
      setEmail("");
      await reload();
    }
  }

  async function cancel(membershipId: string) {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", membershipId })
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? "会员已取消" : data.error || "操作失败");
    if (response.ok) await reload();
  }

  return (
    <div className="space-y-5">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-5 text-primary" />
            手动开通会员
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={open}>
            <div className="space-y-2">
              <Label htmlFor="member-email">用户邮箱</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-plan">套餐</Label>
              <select
                id="member-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                className="focus-ring h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
              >
                <option value="MONTHLY">月会员</option>
                <option value="YEARLY">年会员</option>
              </select>
            </div>
            <Button disabled={loading} className="self-end">
              {loading ? <Loader2 className="animate-spin" /> : <Save />}
              开通
            </Button>
          </form>
        </CardContent>
      </Card>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3">
        {memberships.length ? (
          memberships.map((membership) => (
            <Card key={membership.id} className="glass-panel overflow-hidden">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>{membership.users?.name || membership.users?.email || "会员用户"}</CardTitle>
                  <p className="mt-2 break-all text-sm text-muted-foreground">
                    {membership.users?.email} · {formatDate(membership.starts_at)}
                    {membership.ends_at ? ` 至 ${formatDate(membership.ends_at)}` : ""}
                  </p>
                </div>
                <Badge className="w-fit" variant={membership.status === "ACTIVE" ? "soft" : "outline"}>
                  {membership.plan} · {membership.status}
                </Badge>
              </CardHeader>
              <CardContent>
                {membership.status === "ACTIVE" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cancel(membership.id)}
                    disabled={loading}
                  >
                    <XCircle />
                    取消会员
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="glass-panel rounded-lg p-8 text-center text-muted-foreground">
            暂无会员数据
          </div>
        )}
      </div>
    </div>
  );
}
