import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Remove trailing slash if present
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/chat/",
          "/dashboard/",
          "/admin/",
          "/auth/callback",
          "/auth/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
