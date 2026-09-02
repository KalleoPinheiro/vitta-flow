import type { Metadata } from "next";
import { Sora, Manrope, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "VittaFlow — Clínica de Estomaterapia",
  description: "Gestão de pacientes, agenda e faturamento para clínica de estomaterapia",
};

// CSP estrita com nonce (issue #76) exige um nonce novo por request — só existe
// se a renderização for dinâmica (docs/01-app/02-guides/content-security-policy.md).
// Cobre tanto páginas autenticadas quanto públicas (ex.: /login) — nenhuma delas
// tem hoje um caso de uso que justifique o ganho de estático/ISR sobre o custo
// de desativar essa otimização.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      data-accent="violet"
      className={`${sora.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* sv-body é o seletor base do Still Void: background, cor, família,
          escala tipográfica e antialiasing vêm todos do design system. */}
      <body className="sv-body min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
