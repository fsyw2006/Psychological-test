import type { Metadata } from "next";
import { SupportChat } from "@/components/support/support-chat";

export const metadata: Metadata = {
  title: "在线客服",
  description: "心灵小屋在线客服页面"
};

export default function SupportPage() {
  return <SupportChat />;
}
