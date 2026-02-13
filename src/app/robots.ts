import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/products/"],
        disallow: ["/studio/", "/api/", "/profile", "/login", "/register"],
      },
    ],
    sitemap: "https://guid.how/sitemap.xml",
  };
}
