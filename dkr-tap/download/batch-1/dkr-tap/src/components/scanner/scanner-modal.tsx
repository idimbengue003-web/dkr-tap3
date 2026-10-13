'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Camera, Loader2, ScanLine, Keyboard, X, AlertCircle } from 'lucide-react'

type ScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'error'
  | 'success'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Appelé quand un QR code a été décodé avec succès ET que le slug a été extrait.
   * Retourne true si un sticker correspondant a été trouvé et le modal d'édition ouvert,
   * false sinon (le scanner reste ouvert avec un message d'erreur).
   */
  onSlugScanned: (slug: string) => boolean
}

/**
 * Modal de scan QR code via la caméra du device.
 *
 * Utilise @zxing/browser (BrowserMultiFormatReader) qui gère :
 *   - getUserMedia (permission caméra)
 *   - décodage continu des frames vidéo
 *   - contrôle du lifecycle (start/stop)
 *
 * Fallback : saisie manuelle du slug (utile si la caméra ne fonctionne pas
 * ou si le QR est endommagé).
 *
 * Le flux :
 *   1. Au montage du modal : demande la caméra et démarre le décodage
 *   2. Quand un QR est décodé : extrait le slug depuis l'URL scannée
 *   3. Appelle onSlugScanned(slug) — si true, ferme le modal
 *   4. Si false (sticker introuvable), reste ouvert avec un message d'erreur
 */
export function ScannerModal({ open, onOpenChange, onSlugScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  // Ref pour stocker le callback de scan (évite les re-renders et les deps cycliques)
  const onSlugScannedRef = useRef(onSlugScanned)
  useEffect(() => {
    onSlugScannedRef.current = onSlugScanned
  }, [onSlugScanned])

  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualSlug, setManualSlug] = useState('')
  const { toast } = useToast()

  // --- Fonctions de gestion du scan ---
  // (déclarées avant le useEffect pour éviter "used before declared")

  function extractSlug(text: string): string | null {
    if (!text) return null
    const trimmed = text.trim()

    // Cas 1 : URL complète https://.../api/r/<slug>
    const matchApiR = trimmed.match(/\/api\/r\/([A-Za-z0-9_-]+)/)
    if (matchApiR) return matchApiR[1]

    // Cas 2 : URL sans /api/r mais avec un slug (par ex juste "yntacfta")
    if (/^[A-Za-z0-9_-]{4,30}$/.test(trimmed)) {
      return trimmed
    }

    // Cas 3 : URL qui finit par /<slug> (par ex https://.../yntacfta)
    const matchLastSegment = trimmed.match(/\/([A-Za-z0-9_-]{4,30})(?:[?#]|$)/)
    if (matchLastSegment) return matchLastSegment[1]

    return null
  }

  function handleScanResult(text: string) {
    const slug = extractSlug(text)
    if (!slug) {
      // QR scanné mais ne ressemble pas à un sticker — on ignore (probablement un autre QR)
      return
    }

    // Arrêter la caméra le temps de traiter
    controlsRef.current?.stop()
    setStatus('success')

    const handled = onSlugScannedRef.current(slug)
    if (handled) {
      // Fermer le modal — le modal d'édition s'ouvre chez le parent
      onOpenChange(false)
    } else {
      // Sticker introuvable → reprendre le scan
      toast({
        variant: 'destructive',
        title: 'Sticker introuvable',
        description: `Aucun sticker avec le slug "${slug}". Vérifiez qu'il existe dans l'admin.`,
      })
      setStatus('scanning')
      void restartCamera()
    }
  }

  async function restartCamera() {
    if (!readerRef.current || !videoRef.current) return
    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            handleScanResult(result.getText())
          }
        }
      )
      setStatus('scanning')
    } catch (e) {
      setStatus('error')
      setErrorMessage(getCameraErrorMessage(e))
    }
  }

  // --- Démarrer/arrêter la caméra quand le modal s'ouvre/se ferme ---

  useEffect(() => {
    if (!open) {
      // Fermeture : arrêter la caméra + reset du state du modal
      // (légitime : pattern "reset on close" — le lint est trop strict ici)
      controlsRef.current?.stop()
      controlsRef.current = null
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle')
      setErrorMessage('')
      setShowManualEntry(false)
      setManualSlug('')
      return
    }

    let cancelled = false
    setStatus('starting')
    setErrorMessage('')

    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader()
    }

    // Petit délai pour laisser le <video> se monter dans le DOM
    const timer = setTimeout(async () => {
      if (cancelled || !videoRef.current) return

      try {
        const controls = await readerRef.current!.decodeFromVideoDevice(
          undefined, // device par défaut (caméra arrière sur mobile)
          videoRef.current,
          (result) => {
            if (result) {
              handleScanResult(result.getText())
            }
            // err = ChecksumException, FormatException, etc. → on ignore (continu)
          }
        )

        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setStatus('scanning')
      } catch (e) {
        console.error('[ScannerModal] Camera error:', e)
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

  // --- Saisie manuelle (fallback) ---

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const slug = manualSlug.trim()
    if (!slug) return
    const handled = onSlugScannedRef.current(slug)
    if (handled) {
      onOpenChange(false)
    } else {
      toast({
        variant: 'destructive',
        title: 'Sticker introuvable',
        description: `Slug "${slug}" introuvable dans la base.`,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scanner un sticker</DialogTitle>
          <DialogDescription>
            Visez le QR code du sticker avec la caméra. L&apos;application détecte
            automatiquement le slug et ouvre la fiche d&apos;édition.
          </DialogDescription>
        </DialogHeader>

        {/* Zone caméra */}
        {!showManualEntry ? (
          <div className="space-y-3">
            <div className="relative aspect-square w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
              />

              {/* Overlay : cadre de visée */}
              {status === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-3/4 border-2 border-emerald-400/80 rounded-2xl relative">
                    {/* Coins style scanner */}
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                    {/* Ligne de scan animée */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400/60 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Overlay : status messages */}
              {status === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 bg-zinc-900/80">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm">Démarrage de la caméra…</p>
                </div>
              )}

              {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-4 text-center bg-zinc-900/90">
                  <AlertCircle size={32} className="text-amber-400" />
                  <p className="text-sm font-medium text-amber-100">
                    {errorMessage || 'Caméra indisponible'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Vous pouvez saisir le slug manuellement ci-dessous.
                  </p>
                </div>
              )}

              {status === 'success' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 bg-emerald-950/80">
                  <ScanLine size={28} className="text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-100">
                    QR détecté !
                  </p>
                </div>
              )}
            </div>

            {/* Bouton bascule vers saisie manuelle */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                controlsRef.current?.stop()
                setShowManualEntry(true)
              }}
            >
              <Keyboard size={14} className="mr-1.5" />
              Saisir le slug manuellement
            </Button>
          </div>
        ) : (
          // Saisie manuelle
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-slug">Slug du sticker</Label>
              <Input
                id="manual-slug"
                placeholder="ex : yntacfta"
                value={manualSlug}
                onChange={(e) => setManualSlug(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-zinc-500">
                Vous pouvez trouver le slug dans la liste des stickers ou sous
                le QR code imprimé.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setShowManualEntry(false)
                  void restartCamera()
                }}
              >
                <Camera size={14} className="mr-1.5" />
                Retour caméra
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={!manualSlug.trim()}
              >
                <ScanLine size={14} className="mr-1.5" />
                Ouvrir l&apos;édition
              </Button>
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X size={14} className="mr-1.5" />
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getCameraErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === 'NotAllowedError') {
      return 'Permission caméra refusée. Autorisez la caméra dans les réglages du navigateur.'
    }
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
      return 'Aucune caméra détectée sur cet appareil.'
    }
    if (e.name === 'NotReadableError') {
      return 'La caméra est déjà utilisée par une autre application.'
    }
    if (e.name === 'OverconstrainedError') {
      return 'Aucune caméra ne correspond aux contraintes demandées.'
    }
    return e.message || 'Erreur de caméra inconnue'
  }
  return 'Erreur de caméra inconnue'
}
