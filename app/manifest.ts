import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "心灵小屋 Soul House",
    short_name: "心灵小屋",
    description: "专业心理测评与成长分析平台",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf5ea",
    theme_color: "#61785f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
