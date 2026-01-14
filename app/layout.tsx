import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Pozstar - Sistema de Gestão de Ordens de Serviço",
  description: "Sistema completo para gestão de ordens de serviço em empresas de reparação eletrônica",
  openGraph: {
    title: "Pozstar - Sistema de Gestão de Ordens de Serviço",
    description: "Sistema completo para gestão de ordens de serviço em empresas de reparação eletrônica",
    url: process.env.SITE_URL || "http://localhost:3001",
    siteName: "Pozstar",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pozstar - Sistema de Gestão de Ordens de Serviço",
    description: "Sistema completo para gestão de ordens de serviço em empresas de reparação eletrônica",
  },
  alternates: {
    canonical: process.env.SITE_URL || "http://localhost:3001",
  },
};

export const runtime = "edge";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){try{var s=localStorage.getItem('theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=s?s==='dark':m;var el=document.documentElement;dark?el.classList.add('dark'):el.classList.remove('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
