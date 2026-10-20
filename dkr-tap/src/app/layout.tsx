import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { WhatsAppButton } from "@/components/whatsapp-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'ScanBridge'

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Cartes QR pour vos réseaux sociaux`,
  description: "Vos cartes QR DKR TAP redirigent vos clients directement vers vos réseaux sociaux. TikTok, Instagram, Google, WhatsApp — choisissez votre réseau, on s'occupe du reste. Vos clients scannent, votre audience grandit.",
  keywords: ["QR code", "réseaux sociaux", "Instagram", "TikTok", "Google Reviews", "WhatsApp", "stickers", "Dakar", "Sénégal", BRAND_NAME],
  authors: [{ name: BRAND_NAME }],
  icons: {
    icon: "/dkrtap-logo.jpg",
  },
  // Vérification Google Search Console (pour l'indexation SEO)
  verification: {
    google: "JadpuScNP60RSUIJSPaG_iwf0mOGVL_nT-P21NiyzIs",
  },
  openGraph: {
    title: `${BRAND_NAME} — Cartes QR pour vos réseaux sociaux`,
    description: "Vos cartes QR DKR TAP redirigent vos clients directement vers vos réseaux sociaux. TikTok, Instagram, Google, WhatsApp — choisissez votre réseau, on s'occupe du reste. Vos clients scannent, votre audience grandit.",
    url: "https://www.dkrtap.site",
    siteName: BRAND_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — Cartes QR pour vos réseaux sociaux`,
    description: "Vos cartes QR DKR TAP redirigent vos clients directement vers vos réseaux sociaux. TikTok, Instagram, Google, WhatsApp — choisissez votre réseau, on s'occupe du reste. Vos clients scannent, votre audience grandit.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
