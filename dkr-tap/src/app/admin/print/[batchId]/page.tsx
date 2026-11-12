'use client'

import { useState, useEffect } from 'react'
import { BrandedQR, NETWORK_LOGO_PATHS, NETWORK_STYLES } from '@/components/branded-qr'
import { getEffectiveNetwork } from '@/lib/sticker-template'
import { Printer, Loader2, ArrowLeft, Download, FileText, Archive, FileDown, ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import QRCodeStyling from 'qr-code-styling'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'

type StickerLite = {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  customNetwork?: string | null
  // Champs design (pour rendre le sticker complet dans le PDF)
  stickerTheme?: 'white' | 'black' | 'transparent' | null
  qrPosition?: { x: number; y: number }
  qrSize?: number
  textOverlay?: {
    content: string
    x: number
    y: number
    size: number
  } | null
}

// Type pour le template de design détecté
type DesignTemplate = {
  stickerId: string
  slug: string
  label: string | null
  // Image de fond chargée (HTMLImageElement prête à dessiner sur canvas)
  bgImage: HTMLImageElement
  qrPosition: { x: number; y: number }
  qrSize: number
  textOverlay: {
    content: string
    x: number
    y: number
    size: number
  } | null
  theme: 'white' | 'black' | 'transparent'
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
  // Nombre de QR à inclure dans le PDF (l'utilisateur choisit combien envoyer
  // à l'imprimeur — ex: 10 sur 30 si l'imprimeur fait par petits batches)
  const [pdfCount, setPdfCount] = useState<number | ''>('')
  // Template de design détecté (le 1er sticker du batch qui a une image uploadée)
  const [designTemplate, setDesignTemplate] = useState<DesignTemplate | null>(null)
  const [templateDetecting, setTemplateDetecting] = useState(false)
  const [templateStatus, setTemplateStatus] = useState<'idle' | 'detecting' | 'found' | 'none'>('idle')

  // Lire les slugs depuis l'URL (?slugs=slug1,slug2,...)
  // ou depuis sessionStorage si on vient du bulk create
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slugsParam = params.get('slugs')
    const slugs: string[] = slugsParam
      ? slugsParam.split(',').filter(Boolean)
      : (() => {
          try {
            const stored = sessionStorage.getItem('bulk-print-slugs')
            return stored ? (JSON.parse(stored) as string[]) : []
          } catch {
            return []
          }
        })()

    if (slugs.length === 0) {
      setError('Aucun sticker à imprimer.')
      setLoading(false)
      return
    }

    // Fetch via /api/stickers (endpoint admin qui renvoie les champs design :
    // qrPosition, qrSize, textOverlay, stickerTheme) — l'endpoint public
    // by-slug ne renvoie que les champs publics, insuffisants pour rendre
    // le design complet dans le PDF.
    fetch('/api/stickers', { cache: 'no-store' })
      .then((r) => {
        if (r.status === 401) {
          setError('Session expirée. Reconnecte-toi depuis /admin puis revient sur cette page.')
          setLoading(false)
          return null
        }
        if (!r.ok) throw new Error('Erreur réseau')
        return r.json() as Promise<StickerLite[]>
      })
      .then((all) => {
        if (!all) return
        // Filtrer en gardant l'ordre des slugs de l'URL
        const valid = slugs
          .map((slug) => all.find((s) => s.slug === slug))
          .filter(Boolean) as StickerLite[]
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
  }, [])

  // Helper : charger une image depuis une URL → HTMLImageElement
  const loadImageEl = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      img.src = src
    })
  }

  // Helper : Blob → DataURL (pour jsPDF.addImage)
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Après chargement des stickers : détecter automatiquement un template de
  // design en sondant l'endpoint image de chaque sticker (en parallèle).
  // Le 1er qui a une image uploadée devient le template appliqué à TOUS les
  // QR codes du PDF.
  useEffect(() => {
    if (stickers.length === 0) return
    setTemplateDetecting(true)
    setTemplateStatus('detecting')

    let cancelled = false
    // Sondage parallèle — on prend le 1er (par ordre d'index) qui a une image
    const probe = async (s: StickerLite, index: number) => {
      try {
        const res = await fetch(`/api/stickers/${s.id}/image`, { cache: 'no-store' })
        if (!res.ok) return null
        const blob = await res.blob()
        if (blob.size === 0) return null
        const url = URL.createObjectURL(blob)
        const bgImage = await loadImageEl(url)
        // Trouvé — retourne le template + son index pour garder l'ordre
        return { sticker: s, bgImage, index, objectUrl: url }
      } catch {
        return null
      }
    }

    // Lancer tous les sondages en parallèle
    Promise.all(stickers.map((s, i) => probe(s, i)))
      .then((results) => {
        if (cancelled) return
        // Premier résultat non-null (par ordre d'index)
        const found = results.filter(Boolean).sort((a, b) => a!.index - b!.index)[0]
        if (found) {
          const { sticker, bgImage } = found
          setDesignTemplate({
            stickerId: sticker.id,
            slug: sticker.slug,
            label: sticker.label,
            bgImage,
            qrPosition: sticker.qrPosition ?? { x: 0.85, y: 0.85 },
            qrSize: sticker.qrSize ?? 0.25,
            textOverlay: sticker.textOverlay ?? null,
            theme: sticker.stickerTheme ?? 'white',
          })
          setTemplateStatus('found')
        } else {
          setTemplateStatus('none')
        }
        setTemplateDetecting(false)
      })
      .catch(() => {
        if (cancelled) return
        setTemplateStatus('none')
        setTemplateDetecting(false)
      })

    return () => {
      cancelled = true
    }
  }, [stickers])

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
      // Nombre de stickers à inclure dans le PDF.
      // Si pdfCount est vide ou > total → tous les stickers.
      // Sinon → les N premiers seulement.
      const totalCount = stickers.length
      const count =
        pdfCount === '' || pdfCount <= 0 || pdfCount >= totalCount
          ? totalCount
          : Math.max(1, Math.floor(pdfCount))
      const batch = stickers.slice(0, count)

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

      for (let i = 0; i < batch.length; i++) {
        const s = batch[i]
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

        // Générer le QR PNG haute résolution pour CE sticker (chaque sticker
        // a son propre QR unique, même si le design vient du template)
        const net = getEffectiveNetwork(s.targetUrl, s.customNetwork ?? null)
        const logoUrl = net ? NETWORK_LOGO_PATHS[net] : undefined
        const options = buildQrOptions(getPublicUrl(s.slug), net, 1024, logoUrl)
        const qr = new QRCodeStyling(options)
        const qrBlob = await qr.getRawData('png')

        // Si un template de design est détecté → rendre le sticker complet
        // (background image + QR + text overlay) sur canvas.
        // Sinon → QR seul (fallback).
        let imageDataUrl: string | null = null
        let imageAspect = 1 // width / height

        if (designTemplate && qrBlob) {
          const qrDataUrl = await blobToDataURL(qrBlob)
          imageDataUrl = await renderStickerDesign(
            designTemplate.bgImage,
            qrDataUrl,
            designTemplate.qrPosition,
            designTemplate.qrSize,
            designTemplate.textOverlay,
            designTemplate.theme
          )
          imageAspect =
            designTemplate.bgImage.naturalWidth / designTemplate.bgImage.naturalHeight
        } else if (qrBlob) {
          imageDataUrl = await blobToDataURL(qrBlob)
          imageAspect = 1 // QR est carré
        }

        // Placer l'image dans la cellule (fit + center, préserver l'aspect ratio)
        if (imageDataUrl) {
          const padding = 4
          // Réserver de l'espace en bas pour le slug (toujours) + label (si pas de design)
          const slugZoneH = designTemplate ? 6 : 18
          const availW = cellW - padding * 2
          const availH = cellH - padding * 2 - slugZoneH
          let imgW = availW
          let imgH = imgW / imageAspect
          if (imgH > availH) {
            imgH = availH
            imgW = imgH * imageAspect
          }
          const imgX = cellX + (cellW - imgW) / 2
          const imgY = cellY + padding + (availH - imgH) / 2 // centrer verticalement dans la zone dispo
          pdf.addImage(imageDataUrl, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST')
        }

        // Slug en dessous (identification pour la découpe — toujours affiché)
        const textX = cellX + cellW / 2
        const slugY = cellY + cellH - 3
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(120, 120, 120)
        pdf.text(s.slug, textX, slugY, { align: 'center' })

        // Si PAS de design template : ajouter aussi le label sous le QR
        // (en mode design, le label/texte est déjà dans l'image rendue)
        if (!designTemplate) {
          const labelY = slugY - 5
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(40, 40, 40)
          const labelLines = pdf.splitTextToSize(s.label || s.slug, cellW - 8)
          // Une seule ligne pour éviter de chevaucher le slug
          pdf.text(labelLines[0] || '', textX, labelY, { align: 'center' })
        }

        pdf.setTextColor(0, 0, 0) // reset

        setPdfProgress(Math.round(((i + 1) / batch.length) * 100))
        // Yield au thread pour pas figer l'UI
        await new Promise((r) => setTimeout(r, 0))
      }

      // Pied de page sur chaque page : n° de page + nb total
      const totalPages = Math.ceil(batch.length / (cols * rows))
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(
          `${BRAND_NAME} — ${batch.length}/${stickers.length} stickers${designTemplate ? ' (avec design)' : ''} — page ${p}/${totalPages}`,
          pageW / 2,
          pageH - 5,
          { align: 'center' }
        )
        pdf.setTextColor(0, 0, 0)
      }

      pdf.save(`stickers-pdf-${batch.length}-${Date.now()}.pdf`)
    } finally {
      setPdfLoading(false)
      setPdfProgress(0)
    }
  }

  // Rend un sticker design COMPLET (background image + QR code + text overlay)
  // sur un canvas et retourne une data URL PNG. Utilisé pour le PDF quand un
  // template de design est détecté.
  // - bgImage : image de fond du template (HTMLImageElement déjà chargée)
  // - qrPngDataUrl : PNG du QR code de CE sticker (généré par QRCodeStyling)
  // - qrPosition, qrSize, textOverlay, theme : du template
  const renderStickerDesign = async (
    bgImage: HTMLImageElement,
    qrPngDataUrl: string,
    qrPosition: { x: number; y: number },
    qrSize: number,
    textOverlay: DesignTemplate['textOverlay'],
    theme: 'white' | 'black' | 'transparent'
  ): Promise<string> => {
    // Charger le QR PNG
    const qrImg = await loadImageEl(qrPngDataUrl)

    // Canvas à la résolution naturelle de l'image de fond
    const canvas = document.createElement('canvas')
    canvas.width = bgImage.naturalWidth
    canvas.height = bgImage.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non supporté')

    // Fond selon le thème
    if (theme === 'white') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (theme === 'black') {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    // transparent → pas de fill

    // Dessiner l'image de fond
    ctx.drawImage(bgImage, 0, 0)

    // Dessiner le QR à la position du template
    const minDim = Math.min(bgImage.naturalWidth, bgImage.naturalHeight)
    const clampedQrSize = Math.max(0.05, Math.min(0.8, qrSize))
    const qrPxSize = Math.round(minDim * clampedQrSize)
    const qrCenterX = qrPosition.x * bgImage.naturalWidth
    const qrCenterY = qrPosition.y * bgImage.naturalHeight
    const qrX = qrCenterX - qrPxSize / 2
    const qrY = qrCenterY - qrPxSize / 2
    ctx.drawImage(qrImg, qrX, qrY, qrPxSize, qrPxSize)

    // Dessiner le texte overlay si présent
    if (textOverlay && textOverlay.content.trim()) {
      const fontSize = Math.round(minDim * textOverlay.size)
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const textX = textOverlay.x * bgImage.naturalWidth
      const textY = textOverlay.y * bgImage.naturalHeight
      // Ombre portée pour la lisibilité
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
      ctx.shadowBlur = Math.round(fontSize * 0.15)
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = Math.round(fontSize * 0.06)
      ctx.fillStyle = '#ffffff'
      const lines = textOverlay.content.split('\n')
      const lineHeight = Math.round(fontSize * 1.2)
      const totalHeight = lineHeight * lines.length
      const startY = textY - totalHeight / 2 + fontSize / 2
      lines.forEach((line, i) => {
        ctx.fillText(line, textX, startY + i * lineHeight)
      })
      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    // Retourner la data URL PNG
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Échec de génération du PNG du design'))
          return
        }
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }, 'image/png')
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
          {/* Sélecteur du nombre de QR à inclure dans le PDF.
              L'utilisateur peut choisir d'envoyer seulement N stickers à
              l'imprimeur (ex: 10 sur 30) si l'imprimeur travaille par petits
              batches. Vide = tous les stickers. */}
          <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white">
            <label
              htmlFor="pdf-count"
              className="text-xs font-medium text-zinc-600 whitespace-nowrap"
            >
              Nb QR :
            </label>
            <input
              id="pdf-count"
              type="number"
              min={1}
              max={stickers.length || undefined}
              value={pdfCount}
              placeholder={String(stickers.length)}
              onChange={(e) => {
                const v = e.target.value
                setPdfCount(v === '' ? '' : Math.max(1, parseInt(v, 10) || 1))
              }}
              className="w-14 text-sm text-center border-0 outline-none bg-transparent text-zinc-900 font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              title={`Nombre de QR à inclure dans le PDF (1 à ${stickers.length}). Vide = tous les ${stickers.length} stickers.`}
            />
            <span className="text-xs text-zinc-400">/{stickers.length}</span>
          </div>
          {/* Export PDF UNIQUE — 1 seul fichier PDF avec tous les QR (6/page A4).
              ⭐ Solution recommandée pour l'imprimeur : 1 fichier au lieu de 100 PNG. */}
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading || stickers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              designTemplate
                ? `1 PDF avec ${pdfCount === '' || pdfCount <= 0 ? stickers.length : Math.min(pdfCount, stickers.length)} stickers complets (design + QR, 6/page A4) — pour l'imprimeur`
                : `1 PDF avec ${pdfCount === '' || pdfCount <= 0 ? stickers.length : Math.min(pdfCount, stickers.length)} QR codes seuls (6/page A4) — pour l'imprimeur. Configure un design sur un sticker pour l'inclure.`
            }
          >
            {pdfLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {pdfProgress}%
              </>
            ) : (
              <>
                <FileDown size={14} />
                PDF ({pdfCount === '' || pdfCount <= 0 ? stickers.length : Math.min(pdfCount, stickers.length)}{designTemplate ? ' + design' : ''})
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

      {/* Bannière de statut du template de design (masquée à l'impression) */}
      <div className="no-print max-w-[1100px] mx-auto px-4 sm:px-6 pt-4">
        {templateStatus === 'detecting' && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            <Loader2 size={16} className="animate-spin" />
            Détection d'un design de sticker en cours…
          </div>
        )}
        {templateStatus === 'found' && designTemplate && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">
                Design détecté — le PDF inclura le sticker complet (image + QR + texte)
              </p>
              <p className="text-emerald-700 mt-1">
                Template depuis le sticker <span className="font-mono font-semibold">{designTemplate.slug}</span>
                {designTemplate.label ? ` (${designTemplate.label})` : ''}.
                Chaque sticker du batch recevra son propre QR code positionné sur ce design.
              </p>
            </div>
          </div>
        )}
        {templateStatus === 'none' && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                Aucun design détecté — le PDF contiendra les QR codes seuls
              </p>
              <p className="text-amber-700 mt-1">
                Pour inclure les QR dans un design (image de fond + texte), configure le design
                d'au moins un sticker du batch depuis l'admin (bouton <ImageIcon size={12} className="inline" /> QR /
                Design du sticker), puis reviens sur cette page. Le design du premier sticker configuré
                sera appliqué à tous les QR du PDF.
              </p>
            </div>
          </div>
        )}
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
