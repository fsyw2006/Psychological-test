import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/api"]
      },
      {
        userAgent: "Baiduspider",
        allow: "/",
        disallow: ["/admin", "/account", "/api"]
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin", "/account", "/api"]
      }
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: process.env.NEXT_PUBLIC_SITE_URL
  };
}
