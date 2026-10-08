import type { MetadataRoute } from "next";

// Permite instalar o site na tela inicial; é como a equipe da portaria abre o leitor.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Colaja — ingressos",
    short_name: "Colaja",
    description: "Ingressos para festas e shows, com QR Code e transferência por e-mail.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f8",
    theme_color: "#2b3bff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
