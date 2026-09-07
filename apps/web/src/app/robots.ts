import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/map",
          "/early-warning",
          "/highways",
          "/hydrology",
          "/geotech",
          "/sensors",
          "/community",
          "/consequences",
          "/risk",
          "/creep-watch",
          "/alerts",
          "/ledger",
          "/privacy",
          "/terms",
        ],
        disallow: ["/api/", "/organization/", "/login/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
