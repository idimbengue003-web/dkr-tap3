'use client'

import { useState, useEffect } from 'react'
import { BrandedQR, NETWORK_LOGO_PATHS, NETWORK_STYLES } from '@/components/branded-qr'
import { getEffectiveNetwork } from '@/lib/sticker-template'
import { Printer, Loader2, ArrowLeft, Download, FileText, Archive, FileDown } from 'lucide-react'
import QRCodeStyling from 'qr-code-styling'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'

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
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(0)

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
  // ⚠️ Pour l'export PNG on UTILISE type='canvas' (pas 'svg') car la conversion
  // SVG→PNG perd les gradients → QR noir. Canvas préserve les couleurs.
  const buildQrOptions = (data: string, network: ReturnType<typeof getEffectiveNetwork>, size: number, logoUrl?: string, type: 'svg' | 'canvas' = 'canvas') => {
    const style = network ? NETWORK_STYLES[network] : {
      dotsColor: '#000000',
      cornersColor: '#000000',
      cornersSquareColor: '#000000',
      background: '#ffffff',
    }
    return {
      width: size,
      height: size,
      type,
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

  // Export PDF UNIQUE — 1 seul fichier PDF avec tous les QR codes
  // (6 par page A4 portrait). Solution pour imprimeur qui ne veut pas
  // recevoir 100 PNG individuels : il reçoit 1 PDF qu'il imprime direct.
  const handleExportPdf = async () => {
    setPdfLoading(true)
    setPdfProgress(0)
    try {
      // A4 portrait : 210 × 297 mm
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const pageH = 297
      // Marges (mm)
      const marginX = 14
      const marginTop = 16
      const marginBot = 14
      // Zone utile
      const usableW = pageW - marginX * 2
      const usableH = pageH - marginTop - marginBot
      // Grille 2 × 3 = 6 QR par page
      const cols = 2
      const rows = 3
      const cellW = usableW / cols
      const cellH = usableH / rows
      // Taille du QR dans chaque cellule (mm) — 60mm pour rester lisible
      const qrSizeMm = 58
      // Hauteur réservée au texte (label + slug) sous le QR
      const textZoneH = cellH - qrSizeMm - 6

      for (let i = 0; i < stickers.length; i++) {
        const s = stickers[i]
        // Nouvelle page tous les 6 stickers (sauf pour le 1er)
        if (i > 0 && i % (cols * rows) === 0) {
          pdf.addPage()
        }
        // Position dans la grille (0..5 sur la page courante)
        const posInPage = i % (cols * rows)
        const col = posInPage % cols
        const row = Math.floor(posInPage / cols)
        // Coordonnées du coin haut-gauche de la cellule (mm)
        const cellX = marginX + col * cellW
        const cellY = marginTop + row * cellH

        // Cadre pointillé autour de la cellule (repère de découpe pour l'imprimeur)
        pdf.setDrawColor(212, 212, 216)
        pdf.setLineDashPattern([1, 1], 0)
        pdf.roundedRect(cellX, cellY, cellW, cellH, 2, 2, 'S')
        pdf.setLineDashPattern([], 0)

        // Générer le QR en PNG haute résolution (canvas préserve les gradients)
        const net = getEffectiveNetwork(s.targetUrl, s.customNetwork ?? null)
        const logoUrl = net ? NETWORK_LOGO_PATHS[net] : undefined
        const options = buildQrOptions(getPublicUrl(s.slug), net, 1024, logoUrl)
        const qr = new QRCodeStyling(options)
        const blob = await qr.getRawData('png')
        if (blob) {
          const dataUrl = await blobToDataURL(blob)
          // Centrer le QR horizontalement dans la cellule
          const qrX = cellX + (cellW - qrSizeMm) / 2
          const qrY = cellY + 4 // petite marge top dans la cellule
          pdf.addImage(dataUrl, 'PNG', qrX, qrY, qrSizeMm, qrSizeMm, undefined, 'FAST')
        }

        // Texte sous le QR : label (gras) + slug (mono)
        const textX = cellX + cellW / 2 // centré
        const labelY = cellY + 4 + qrSizeMm + 5
        const label = s.label || s.slug
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        // SplitText gère les labels longs (retour à la ligne auto)
        const labelLines = pdf.splitTextToSize(label, cellW - 8)
        pdf.text(labelLines, textX, labelY, { align: 'center' })

        // Slug en dessous (mono, gris)
        const slugLines = labelLines.length
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(90, 90, 90)
        pdf.text(s.slug, textX, labelY + slugLines * 4 + 2, { align: 'center' })
        pdf.setTextColor(0, 0, 0) // reset

        setPdfProgress(Math.round(((i + 1) / stickers.length) * 100))
        // Yield au thread pour pas figer l'UI
        await new Promise((r) => setTimeout(r, 0))
      }

      // Pied de page sur chaque page : n° de page + nb total
      const totalPages = Math.ceil(stickers.length / (cols * rows))
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(
          `${BRAND_NAME} — batch ${stickers.length} stickers — page ${p}/${totalPages}`,
          pageW / 2,
          pageH - 5,
          { align: 'center' }
        )
        pdf.setTextColor(0, 0, 0)
      }

      pdf.save(`stickers-pdf-${stickers.length}-${Date.now()}.pdf`)
    } finally {
      setPdfLoading(false)
      setPdfProgress(0)
    }
  }

  // Helper : Blob → DataURL (pour jsPDF.addImage qui veut une dataURL)
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
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
          {/* Export PDF UNIQUE — 1 seul fichier PDF avec tous les QR (6/page A4).
              ⭐ Solution recommandée pour l'imprimeur : 1 fichier au lieu de 100 PNG. */}
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading || stickers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title="1 seul PDF avec tous les QR codes (6 par page A4) — idéal pour envoyer à l'imprimeur"
          >
            {pdfLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {pdfProgress}%
              </>
            ) : (
              <>
                <FileDown size={14} />
                PDF (1 fichier)
              </>
            )}
          </button>
          {/* Imprimer via navigateur (save as PDF depuis le dialogue d'impression) */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50"
            title="Ouvrir le dialogue d'impression du navigateur (Save as PDF possible)"
          >
            <Printer size={14} />
            Imprimer
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
          /* ⚠️ Force les couleurs (gradients, backgrounds) à l'impression.
             Par défaut les navigateurs désactivent les backgrounds → QR noir. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: white !important;
          }

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
