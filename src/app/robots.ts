import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout/", "/ingressos", "/conta", "/checkin/", "/camarotes/", "/transferencia/", "/demo/", "/api/", "/entrar"],
    },
    sitemap: "https://colajaingressos.com.br/sitemap.xml",
  };
}
