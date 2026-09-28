import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScanBridge - Gestion de stickers QR",
  description: "Passerelle de redirection QR code avec interface d'administration. Modifiez les liens de vos stickers sans les réimprimer.",
  keywords: ["QR code", "passerelle", "redirection", "stickers", "admin", "ScanBridge"],
  authors: [{ name: "ScanBridge" }],
  icons: {
    icon: "/scanbridge-logo.svg",
  },
  openGraph: {
    title: "ScanBridge",
    description: "Gérez les redirections de vos stickers QR code",
    url: "https://chat.z.ai",
    siteName: "ScanBridge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScanBridge",
    description: "Gérez les redirections de vos stickers QR code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
