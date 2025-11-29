import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://intentifi.xyz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/faucet",
          "/dashboard",
          "/intent",
          "/swap",
          "/analytics",
          "/login",
          "/register",
          "/verify",
          "/privacy",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/test/",
          "/_next/",
          "/admin/",
          "*.json",
          "/private/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/faucet", "/dashboard", "/intent", "/swap", "/analytics"],
        disallow: ["/api/", "/auth/", "/test/"],
        crawlDelay: 1,
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/faucet", "/dashboard", "/intent", "/swap", "/analytics"],
        crawlDelay: 2,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
