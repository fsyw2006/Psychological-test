import type { Metadata } from "next";
import { ResultReport } from "@/components/reports/result-report";

export const metadata: Metadata = {
  title: "测评报告",
  description: "查看心理测评基础分析与高级成长报告。"
};

export default async function ReportPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResultReport resultId={id} />;
}
