'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Camera, Loader2, ScanLine, Keyboard, X, AlertCircle, Save, ExternalLink, Edit3, QrCode } from 'lucide-react'

type StickerInfo = {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  active: boolean
  scanCount: number
}

type ScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'error'
  | 'success'
  | 'quickEdit'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Appelé quand l'admin veut ouvrir l'éditeur complet (modal design).
   * Retourne true si un sticker correspondant a été trouvé.
   */
  onSlugScanned: (slug: string) => boolean
  /**
   * Liste des stickers de l'admin (pour recherche rapide par slug après scan).
   */
  stickers: StickerInfo[]
}

export function ScannerModal({ open, onOpenChange, onSlugScanned, stickers }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const onSlugScannedRef = useRef(onSlugScanned)

  useEffect(() => {
    onSlugScannedRef.current = onSlugScanned
  }, [onSlugScanned])

  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualSlug, setManualSlug] = useState('')
  const { toast } = useToast()

  // État pour le panneau d'édition rapide
  const [scannedSticker, setScannedSticker] = useState<StickerInfo | null>(null)
  const [quickEditUrl, setQuickEditUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [urlSaved, setUrlSaved] = useState(false)

  function extractSlug(text: string): string | null {
    if (!text) return null
    const trimmed = text.trim()
    const matchApiR = trimmed.match(/\/api\/r\/([A-Za-z0-9_-]+)/)
    if (matchApiR) return matchApiR[1]
    if (/^[A-Za-z0-9_-]{4,30}$/.test(trimmed)) return trimmed
    const matchLastSegment = trimmed.match(/\/([A-Za-z0-9_-]{4,30})(?:[?#]|$)/)
    if (matchLastSegment) return matchLastSegment[1]
    return null
  }

  function handleScanResult(text: string) {
    const slug = extractSlug(text)
    if (!slug) return

    controlsRef.current?.stop()

    // Chercher le sticker dans la liste de l'admin
    const found = stickers.find((s) => s.slug === slug)
    if (found) {
      setScannedSticker(found)
      setQuickEditUrl(found.targetUrl || '')
      setUrlSaved(false)
      setStatus('quickEdit')
    } else {
      // Sticker pas dans la liste → essayer l'éditeur complet (peut-être qu'il existe mais pas chargé)
      const handled = onSlugScannedRef.current(slug)
      if (handled) {
        onOpenChange(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Sticker introuvable',
          description: `Aucun sticker avec le slug "${slug}".`,
        })
        setStatus('scanning')
        void restartCamera()
      }
    }
  }

  async function restartCamera() {
    if (!readerRef.current || !videoRef.current) return
    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined, videoRef.current,
        (result) => { if (result) handleScanResult(result.getText()) }
      )
      setStatus('scanning')
    } catch (e) {
      setStatus('error')
      setErrorMessage(getCameraErrorMessage(e))
    }
  }

  // Quick save URL
  const handleQuickSave = async () => {
    if (!scannedSticker || savingUrl) return
    setSavingUrl(true)
    setUrlSaved(false)
    try {
      let finalUrl = quickEditUrl.trim()
      if (finalUrl && !finalUrl.match(/^https?:\/\//)) {
        finalUrl = `https://${finalUrl}`
      }
      const res = await fetch(`/api/stickers/${scannedSticker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: finalUrl || null }),
      })
      if (!res.ok) throw new Error('Échec sauvegarde')
      setUrlSaved(true)
      setTimeout(() => setUrlSaved(false), 2000)
      toast({ title: 'URL modifiée', description: `Carte ${scannedSticker.slug} → ${finalUrl || '(vide)'}` })
      // Mettre à jour le sticker local
      setScannedSticker({ ...scannedSticker, targetUrl: finalUrl || null })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: (e as Error).message })
    } finally {
      setSavingUrl(false)
    }
  }

  // Resume scanning
  const handleScanAnother = () => {
    setScannedSticker(null)
    setQuickEditUrl('')
    setStatus('scanning')
    void restartCamera()
  }

  // Open full editor
  const handleFullEdit = () => {
    if (scannedSticker) {
      const handled = onSlugScannedRef.current(scannedSticker.slug)
      if (handled) onOpenChange(false)
    }
  }

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop()
      controlsRef.current = null
      setStatus('idle')
      setErrorMessage('')
      setShowManualEntry(false)
      setManualSlug('')
      setScannedSticker(null)
      setQuickEditUrl('')
      return
    }

    let cancelled = false
    setStatus('starting')
    setErrorMessage('')

    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader()
    }

    const timer = setTimeout(async () => {
      if (cancelled || !videoRef.current) return
      try {
        const controls = await readerRef.current!.decodeFromVideoDevice(
          undefined, videoRef.current,
          (result) => { if (result) handleScanResult(result.getText()) }
        )
        if (cancelled) { controls.stop(); return }
        controlsRef.current = controls
        setStatus('scanning')
      } catch (e) {
        setStatus('error')
        setErrorMessage(getCameraErrorMessage(e))
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [open])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const slug = manualSlug.trim()
    if (!slug) return
    const found = stickers.find((s) => s.slug === slug)
    if (found) {
      setScannedSticker(found)
      setQuickEditUrl(found.targetUrl || '')
      setUrlSaved(false)
      setStatus('quickEdit')
    } else {
      const handled = onSlugScannedRef.current(slug)
      if (handled) onOpenChange(false)
      else toast({ variant: 'destructive', title: 'Introuvable', description: `Slug "${slug}" introuvable.` })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scanner & modifier un QR</DialogTitle>
          <DialogDescription>
            Scannez une carte DKR TAP pour la modifier rapidement, ou saisissez le slug manuellement.
          </DialogDescription>
        </DialogHeader>

        {/* === VUE QUICK EDIT === */}
        {status === 'quickEdit' && scannedSticker ? (
          <div className="space-y-4">
            {/* Sticker info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <QrCode size={20} className="text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{scannedSticker.label || 'Carte sans nom'}</p>
                <p className="text-xs text-zinc-500">Slug : {scannedSticker.slug}</p>
                <p className="text-xs text-zinc-500">{scannedSticker.scanCount} scan{scannedSticker.scanCount > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Quick edit URL */}
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">URL de redirection</Label>
              <Input
                type="text"
                value={quickEditUrl}
                onChange={(e) => { setQuickEditUrl(e.target.value); setUrlSaved(false) }}
                placeholder="https://instagram.com/votre-compte"
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Laissez vide pour désactiver la redirection (la carte affichera la page de configuration).
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleQuickSave}
                disabled={savingUrl}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-400"
              >
                {savingUrl ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {urlSaved ? <><Save size={14} className="mr-1" /> Enregistré !</> : <><Save size={14} className="mr-1" /> Enregistrer</>}
              </Button>
              <Button
                onClick={() => window.open(`/api/r/${scannedSticker.slug}`, '_blank')}
                variant="outline"
                size="sm"
              >
                <ExternalLink size={14} className="mr-1" /> Tester
              </Button>
              <Button onClick={handleFullEdit} variant="outline" size="sm">
                <Edit3 size={14} className="mr-1" /> Éditeur complet
              </Button>
              <Button onClick={handleScanAnother} variant="outline" size="sm">
                <Camera size={14} className="mr-1" /> Scanner autre
              </Button>
            </div>
          </div>
        ) : !showManualEntry ? (
          /* === VUE SCANNER === */
          <div className="space-y-3">
            <div className="relative aspect-square w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
              {status === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-3/4 border-2 border-emerald-400/80 rounded-2xl relative">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400/60 animate-pulse" />
                  </div>
                </div>
              )}
              {status === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-zinc-900/80">
                  <Loader2 size={28} className="animate-spin" />
                </div>
              )}
              {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-4 text-center bg-zinc-900/90">
                  <AlertCircle size={32} className="text-amber-400" />
                  <p className="text-sm text-amber-100">{errorMessage || 'Caméra indisponible'}</p>
                </div>
              )}
              {status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-emerald-950/80">
                  <ScanLine size={28} className="text-emerald-400" />
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => { controlsRef.current?.stop(); setShowManualEntry(true) }}>
              <Keyboard size={14} className="mr-1.5" /> Saisir le slug manuellement
            </Button>
          </div>
        ) : (
          /* === VUE SAISIE MANUELLE === */
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-slug">Slug du sticker</Label>
              <Input id="manual-slug" placeholder="ex : yntacfta" value={manualSlug} onChange={(e) => setManualSlug(e.target.value)} autoFocus />
              <p className="text-xs text-zinc-500">Cherchez par slug pour modifier n'importe quelle carte.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setShowManualEntry(false); void restartCamera() }}>
                <Camera size={14} className="mr-1.5" /> Retour caméra
              </Button>
              <Button type="submit" size="sm" className="flex-1" disabled={!manualSlug.trim()}>
                <ScanLine size={14} className="mr-1.5" /> Modifier
              </Button>
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X size={14} className="mr-1.5" /> Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getCameraErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === 'NotAllowedError') return 'Permission caméra refusée.'
    if (e.name === 'NotFoundError') return 'Aucune caméra détectée.'
    if (e.name === 'NotReadableError') return 'Caméra utilisée par une autre app.'
    return e.message || 'Erreur de caméra'
  }
  return 'Erreur de caméra'
}
