'use client'

import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

type Network = 'google' | 'tiktok' | 'instagram' | 'whatsapp' | 'youtube' | 'facebook' | 'snapchat' | null

type Props = {
  data: string // L'URL encodée dans le QR
  network: Network
  size?: number
  logoUrl?: string // Logo à embarquer au centre (optionnel)
}

// Configuration par réseau : couleurs, gradient, style de points
const NETWORK_STYLES: Record<Exclude<Network, null>, {
  dotsColor: string
  dotsColor2?: string
  cornersColor: string
  cornersSquareColor: string
  background: string
  gradientType?: 'linear' | 'radial'
  gradientRotation?: number
}> = {
  instagram: {
    dotsColor: '#d6299f',
    dotsColor2: '#f09433',
    cornersColor: '#833ab4',
    cornersSquareColor: '#fdcb6e',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: Math.PI / 4,
  },
  whatsapp: {
    dotsColor: '#25D366',
    dotsColor2: '#075e54',
    cornersColor: '#128C7E',
    cornersSquareColor: '#25D366',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: Math.PI / 2,
  },
  tiktok: {
    dotsColor: '#25F4EE',
    dotsColor2: '#FE2C55',
    cornersColor: '#000000',
    cornersSquareColor: '#25F4EE',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: Math.PI / 4,
  },
  google: {
    dotsColor: '#4285F4',
    dotsColor2: '#34A853',
    cornersColor: '#FBBC05',
    cornersSquareColor: '#EA4335',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: 0,
  },
  youtube: {
    dotsColor: '#FF0000',
    dotsColor2: '#cc0000',
    cornersColor: '#FF0000',
    cornersSquareColor: '#cc0000',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: Math.PI / 4,
  },
  facebook: {
    dotsColor: '#1877F2',
    dotsColor2: '#0a42c2',
    cornersColor: '#1877F2',
    cornersSquareColor: '#0a42c2',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: Math.PI / 2,
  },
  snapchat: {
    dotsColor: '#FFFC00',
    dotsColor2: '#f5d800',
    cornersColor: '#FFFC00',
    cornersSquareColor: '#f5d800',
    background: '#ffffff',
    gradientType: 'linear',
    gradientRotation: Math.PI / 4,
  },
}

export function BrandedQR({ data, network, size = 280, logoUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const style = network ? NETWORK_STYLES[network] : {
      dotsColor: '#000000',
      cornersColor: '#000000',
      cornersSquareColor: '#000000',
      background: '#ffffff',
    }

    const options: any = {
      width: size,
      height: size,
      type: 'svg',
      data: data,
      // Points arrondis (pas carrés)
      dotsOptions: {
        type: 'rounded',
        gradient: style.gradientType ? {
          type: style.gradientType,
          rotation: style.gradientRotation ?? 0,
          colorStops: [
            { offset: 0, color: style.dotsColor },
            { offset: 1, color: style.dotsColor2 || style.dotsColor },
          ],
        } : undefined,
        color: style.gradientType ? undefined : style.dotsColor,
      },
      // Coins arrondis
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: style.cornersSquareColor,
      },
      cornersDotOptions: {
        type: 'dot',
        color: style.cornersColor,
      },
      backgroundOptions: {
        color: style.background,
      },
      image: logoUrl || undefined,
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 5,
        imageSize: 0.4,
        hideBackgroundDots: true,
      },
      qrOptions: {
        errorCorrectionLevel: 'H',
      },
    }

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options)
      qrRef.current.append(containerRef.current)
    } else {
      qrRef.current.update(options)
    }
  }, [data, network, size, logoUrl])

  return <div ref={containerRef} style={{ display: 'inline-block' }} />
}

// Configuration exportée pour usage serveur (URL de logo par réseau)
export const NETWORK_LOGO_PATHS: Record<Exclude<Network, null>, string> = {
  google: '/network-google.svg',
  instagram: '/network-instagram.svg',
  tiktok: '/network-tiktok.svg',
  whatsapp: '/network-whatsapp.svg',
  youtube: '/network-youtube.svg',
  facebook: '/network-facebook.svg',
  snapchat: '/network-snapchat.svg',
}
