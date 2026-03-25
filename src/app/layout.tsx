import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { Navigation } from "@/components/Navigation";
import { AgeGate } from "@/components/AgeGate";

export const metadata: Metadata = {
  title: "Encanta — Contenido Faceless Premium",
  description: "Donde el arte se encuentra con el deseo. Plataforma premium de contenido faceless en Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0608" />
      </head>
      <body className="antialiased min-h-screen">
        <WalletProvider>
          <AgeGate />
          <Navigation />
          <main className="pb-20 md:pb-0">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
