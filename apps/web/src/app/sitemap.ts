import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();

  const routes = [
    { path: "", changeFrequency: "always" as const, priority: 1.0 },
    { path: "/map", changeFrequency: "always" as const, priority: 0.95 },
    { path: "/early-warning", changeFrequency: "hourly" as const, priority: 0.95 },
    { path: "/highways", changeFrequency: "hourly" as const, priority: 0.9 },
    { path: "/geotech", changeFrequency: "hourly" as const, priority: 0.85 },
    { path: "/sensors", changeFrequency: "hourly" as const, priority: 0.85 },
    { path: "/community", changeFrequency: "hourly" as const, priority: 0.85 },
    { path: "/consequences", changeFrequency: "hourly" as const, priority: 0.85 },
    { path: "/risk", changeFrequency: "hourly" as const, priority: 0.85 },
    { path: "/creep-watch", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/hydrology", changeFrequency: "hourly" as const, priority: 0.85 },
    { path: "/alerts", changeFrequency: "always" as const, priority: 0.9 },
    { path: "/ledger", changeFrequency: "hourly" as const, priority: 0.8 },
    { path: "/operations", changeFrequency: "always" as const, priority: 0.9 },
    { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/terms", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/login", changeFrequency: "monthly" as const, priority: 0.4 },
  ];

  return routes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
