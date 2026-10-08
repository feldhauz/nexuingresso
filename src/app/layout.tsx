import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { Footer, Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://colajaingressos.com.br"),
  openGraph: { siteName: "Colaja", locale: "pt_BR", type: "website" },
  title: { default: "Colaja — ingressos para festas e shows", template: "%s | Colaja" },
  description:
    "Compre ingressos pelo celular, receba o QR Code na hora e transfira por e-mail se não puder ir.",
};

export const viewport: Viewport = {
  themeColor: "#2b3bff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
          {children}
        </main>
        <Footer />
        <Suspense>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
