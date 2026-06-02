import type { Metadata, Viewport } from "next";
import type React from "react";
import "@/app/globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { absoluteUrl } from "@/lib/utils";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf5ea" },
    { media: "(prefers-color-scheme: dark)", color: "#111f1b" }
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "心灵小屋 Soul House - 专业心理测评与成长分析平台",
    template: "%s | 心灵小屋"
  },
  description: "完成 MBTI、九型人格、DISC、PHQ-9、GAD-7、职业与关系测评，获得基础与高级成长报告。",
  keywords: [
    "心理测评",
    "MBTI",
    "九型人格",
    "DISC",
    "PHQ-9",
    "GAD-7",
    "职业测评",
    "情感关系"
  ],
  alternates: {
    canonical: absoluteUrl("/")
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: absoluteUrl("/"),
    siteName: "心灵小屋 Soul House",
    title: "心灵小屋 Soul House",
    description: "专业心理测评与成长分析平台",
    images: [
      {
        url: "/images/hero-soul-house.png",
        width: 1600,
        height: 900,
        alt: "心灵小屋柔和测评空间"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "心灵小屋 Soul House",
    description: "专业心理测评与成长分析平台",
    images: ["/images/hero-soul-house.png"]
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      "baidu-site-verification": process.env.BAIDU_SITE_VERIFICATION || ""
    }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
