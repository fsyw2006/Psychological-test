export type SupportTopic =
  | "account"
  | "membership"
  | "payment"
  | "report"
  | "assessment"
  | "ai"
  | "other";

export type SupportStatus = "OPEN" | "REPLIED" | "RESOLVED";

export const supportTopics: Array<{ key: SupportTopic; label: string }> = [
  { key: "account", label: "账号登录" },
  { key: "membership", label: "会员权益" },
  { key: "payment", label: "支付订单" },
  { key: "report", label: "报告问题" },
  { key: "assessment", label: "测评题库" },
  { key: "ai", label: "AI 功能" },
  { key: "other", label: "其他问题" }
];

export const supportTopicKeys = supportTopics.map((topic) => topic.key) as [
  SupportTopic,
  ...SupportTopic[]
];

export function supportTopicLabel(topic?: string | null) {
  return supportTopics.find((item) => item.key === topic)?.label || "其他问题";
}

export function supportStatusLabel(status?: string | null) {
  if (status === "REPLIED") return "已回复";
  if (status === "RESOLVED") return "已处理";
  return "待回复";
}
