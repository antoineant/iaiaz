import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Remove trailing slash if present
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com").replace(/\/$/, "");

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/comparatif`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/etudiants`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tarifs`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/legal/cgu`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cgv`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cookies`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

  return staticPages;
}
