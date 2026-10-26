import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
    icon: "/dkrtap-logo.png",
    apple: "/dkrtap-logo.png",
  },
  manifest: "/manifest.json",
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
  // JSON-LD structured data pour Google Search (Organization + logo)
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": BRAND_NAME,
    "url": "https://www.dkrtap.site",
    "logo": "https://www.dkrtap.site/dkrtap-logo.png",
    "description": "Vos cartes QR DKR TAP redirigent vos clients directement vers vos réseaux sociaux. TikTok, Instagram, Google, WhatsApp — choisissez votre réseau, on s'occupe du reste.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+221789271296",
      "email": "dkrtap@gmail.com",
      "contactType": "customer service",
      "availableLanguage": ["French"]
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "SN",
      "addressLocality": "Dakar"
    }
  }
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": BRAND_NAME,
    "url": "https://www.dkrtap.site",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.dkrtap.site/?s={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Providers>
          {children}
          <Toaster />
          <WhatsAppButton />
        </Providers>
        {/* Google Analytics GA4 */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
