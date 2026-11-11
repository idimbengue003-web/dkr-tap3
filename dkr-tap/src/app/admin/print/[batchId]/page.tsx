'use client'

import { useState, useEffect } from 'react'
import { BrandedQR, NETWORK_LOGO_PATHS, NETWORK_STYLES } from '@/components/branded-qr'
import { getEffectiveNetwork } from '@/lib/sticker-template'
import { Printer, Loader2, ArrowLeft, Download, FileText, Archive } from 'lucide-react'
import QRCodeStyling from 'qr-code-styling'
import JSZip from 'jszip'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'

type StickerLite = {
  slug: string
  label: string | null
  targetUrl: string | null
  customNetwork?: string | null
}

export default function PrintBatchPage() {
  const [stickers, setStickers] = useState<StickerLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // États pour les exports
  const [csvLoading, setCsvLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)

  // Lire les slugs depuis l'URL (?slugs=slug1,slug2,...)
  // ou depuis sessionStorage si on vient du bulk create
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slugsParam = params.get('slugs')

    if (slugsParam) {
      const slugs = slugsParam.split(',').filter(Boolean)
      // Récupérer les infos de chaque sticker en parallèle
      Promise.all(
        slugs.map((s) =>
          fetch(`/api/stickers/by-slug/${s}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      )
        .then((results) => {
          const valid = results.filter(Boolean) as StickerLite[]
          if (valid.length === 0) {
            setError('Aucun sticker trouvé pour ce batch.')
          } else {
            setStickers(valid)
          }
          setLoading(false)
        })
        .catch(() => {
          setError('Erreur lors du chargement.')
          setLoading(false)
        })
    } else {
      // Fallback : sessionStorage
      try {
        const stored = sessionStorage.getItem('bulk-print-slugs')
        if (stored) {
          const slugs = JSON.parse(stored) as string[]
          // Re-fetch
          Promise.all(
            slugs.map((s) =>
              fetch(`/api/stickers/by-slug/${s}`)
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            )
          ).then((results) => {
            const valid = results.filter(Boolean) as StickerLite[]
            setStickers(valid)
            setLoading(false)
          })
        } else {
          setError('Aucun sticker à imprimer.')
          setLoading(false)
        }
      } catch {
        setError('Session expirée.')
        setLoading(false)
      }
    }
  }, [])

  // URL publique du QR (celle qui sera scannée)
  const getPublicUrl = (slug: string) => {
    if (typeof window === 'undefined') return `/api/r/${slug}`
    return `${window.location.origin}/api/r/${slug}`
  }

  // Télécharger un blob avec un nom de fichier donné
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Construit les options QRCodeStyling (mêmes réglages que le composant BrandedQR)
  const buildQrOptions = (data: string, network: ReturnType<typeof getEffectiveNetwork>, size: number, logoUrl?: string) => {
    const style = network ? NETWORK_STYLES[network] : {
      dotsColor: '#000000',
      cornersColor: '#000000',
      cornersSquareColor: '#000000',
      background: '#ffffff',
    }
    return {
      width: size,
      height: size,
      type: 'svg' as const,
      data,
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
        errorCorrectionLevel: 'H' as const,
      },
    }
  }

  // Export CSV — slug, publicUrl, label (compatible Canva Bulk Create)
  const handleExportCsv = () => {
    setCsvLoading(true)
    try {
      const rows = [
        // En-têtes Canva Bulk Create
        ['slug', 'publicUrl', 'label', 'qrImageUrl'],
        ...stickers.map((s) => [
          s.slug,
          getPublicUrl(s.slug),
          s.label || '',
          `${typeof window !== 'undefined' ? window.location.origin : ''}/api/r/${s.slug}`,
        ]),
      ]
      // CSV simple avec virgules + guillemets pour les champs contenant des virgules
      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      downloadBlob(blob, `stickers-batch-${Date.now()}.csv`)
    } finally {
      setCsvLoading(false)
    }
  }

  // Export ZIP de PNG individuels — 1 fichier PNG par sticker
  const handleExportZip = async () => {
    setZipLoading(true)
    setZipProgress(0)
    try {
      const zip = new JSZip()
      const folder = zip.folder('stickers-qr')
      if (!folder) throw new Error('ZIP folder creation failed')

      // Générer chaque QR en PNG (1024px pour qualité impression)
      for (let i = 0; i < stickers.length; i++) {
        const s = stickers[i]
        const net = getEffectiveNetwork(s.targetUrl, s.customNetwork ?? null)
        const logoUrl = net ? NETWORK_LOGO_PATHS[net] : undefined
        const options = buildQrOptions(getPublicUrl(s.slug), net, 1024, logoUrl)
        const qr = new QRCodeStyling(options)
        const blob = await qr.getRawData('png')
        if (blob) {
          // Nom de fichier : index_slug.png pour faciliter le tri
          const idx = String(i + 1).padStart(3, '0')
          folder.file(`${idx}_${s.slug}.png`, blob)
        }
        setZipProgress(Math.round(((i + 1) / stickers.length) * 100))
        // Yield au thread pour pas figer l'UI
        await new Promise((r) => setTimeout(r, 0))
      }

      // Ajouter un README dans le ZIP
      const readme = `DKR TAP — Batch de ${stickers.length} stickers QR

Chaque fichier PNG contient un QR code unique qui pointe vers :
  https://www.dkrtap.site/api/r/<slug>

Quand un client scanne le QR :
  1. Il arrive sur la page /configure/<slug>
  2. Il saisit son URL (Instagram, TikTok, etc.)
  3. Il valide → l'URL est enregistrée pour CE slug
  4. Les scans suivants redirigent vers son URL

Liste des stickers inclus :
${stickers.map((s, i) => `  ${String(i + 1).padStart(3, '0')}. ${s.slug} — ${s.label || '(sans label)'}`).join('\n')}
`
      folder.file('README.txt', readme)

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `stickers-qr-${stickers.length}-${Date.now()}.zip`)
    } finally {
      setZipLoading(false)
      setZipProgress(0)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-zinc-500 mb-4">{error}</p>
        <a href="/admin" className="text-emerald-600 hover:underline">
          ← Retour à l'admin
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <a
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft size={14} />
          Admin
        </a>
        <div className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">{stickers.length}</span> stickers à imprimer
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV pour Canva Bulk Create */}
          <button
            onClick={handleExportCsv}
            disabled={csvLoading || stickers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exporter un CSV (compatible Canva Bulk Create)"
          >
            <FileText size={14} />
            CSV
          </button>
          {/* Export ZIP de PNG individuels */}
          <button
            onClick={handleExportZip}
            disabled={zipLoading || stickers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Télécharger un ZIP avec 1 PNG par sticker (1024px)"
          >
            {zipLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {zipProgress}%
              </>
            ) : (
              <>
                <Archive size={14} />
                ZIP (PNG)
              </>
            )}
          </button>
          {/* Imprimer / PDF */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400"
          >
            <Printer size={14} />
            Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Grille de QR codes — visible à l'écran et à l'impression */}
      <div className="print-grid max-w-[1100px] mx-auto p-4 sm:p-6">
        {stickers.map((s) => {
          const net = getEffectiveNetwork(s.targetUrl, s.customNetwork ?? null)
          const logoUrl = net ? NETWORK_LOGO_PATHS[net] : undefined
          return (
            <div key={s.slug} className="print-card">
              <div className="print-card-qr">
                <BrandedQR
                  data={getPublicUrl(s.slug)}
                  network={net}
                  size={200}
                  logoUrl={logoUrl}
                />
              </div>
              <div className="print-card-label">
                {s.label || s.slug}
              </div>
              <div className="print-card-slug">
                {s.slug}
              </div>
            </div>
          )
        })}
      </div>

      {/* CSS spécifique impression — intégré pour pas polluer globals.css */}
      <style jsx global>{`
        @media screen {
          .print-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
          }
          .print-card {
            background: white;
            border: 1px solid #e4e4e7;
            border-radius: 10px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .print-card-qr {
            width: 200px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
          }
          .print-card-label {
            font-size: 12px;
            font-weight: 600;
            color: #18181b;
            margin-bottom: 4px;
            word-break: break-word;
          }
          .print-card-slug {
            font-size: 10px;
            font-family: monospace;
            color: #71717a;
          }
        }

        @media print {
          /* Cache la barre d'actions à l'impression */
          .no-print { display: none !important; }

          /* Format A4 : 6 QR codes par page en grille 2x3 */
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12mm !important;
            padding: 0 !important;
            max-width: none !important;
            margin: 0 !important;
          }
          .print-card {
            background: white !important;
            border: 1px dashed #d4d4d8 !important;
            border-radius: 6px !important;
            padding: 8mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-card-qr {
            width: 60mm !important;
            height: 60mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin-bottom: 4mm !important;
          }
          .print-card-label {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #000 !important;
            margin-bottom: 2mm !important;
            word-break: break-word !important;
          }
          .print-card-slug {
            font-size: 9px !important;
            font-family: monospace !important;
            color: #555 !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  )
}
