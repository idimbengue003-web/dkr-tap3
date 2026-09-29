'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  QrCode,
  ScanLine,
  Copy,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  MousePointerClick,
  Globe,
  StickyNote,
  LogOut,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { ScannerModal } from '@/components/scanner/scanner-modal'
import {
  renderStickerSvg,
  detectNetwork,
  getEffectiveNetwork,
  NETWORKS,
  type Network,
} from '@/lib/sticker-template'

type Sticker = {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  scanCount: number
  active: boolean
  createdAt: string
  updatedAt: string
  customActionText?: string | null
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
}

type StickerForm = {
  label: string
  targetUrl: string
  slug: string
  active: boolean
  customActionText: string
  customNetwork: 'auto' | 'google' | 'tiktok' | 'instagram' | 'none'
}

const EMPTY_FORM: StickerForm = {
  label: '',
  targetUrl: '',
  slug: '',
  active: true,
  customActionText: '',
  customNetwork: 'auto',
}

// Payload retourné par GET /api/stats
type StatsPayload = {
  generatedAt: string
  summary: {
    total: number
    configured: number
    blank: number
    active: number
    totalScans: number
    avgScansPerSticker: number
  }
  topStickers: Array<{
    slug: string
    label: string | null
    targetUrl: string | null
    scanCount: number
    active: boolean
  }>
  recentScans: Array<{
    slug: string
    ts: string
    targetUrl: string | null
    label: string | null
  }>
}

// Branding — lu depuis les variables d'env NEXT_PUBLIC_*
// (évalué au build time côté client, mais reste configurable via .env)
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'ScanBridge'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/scanbridge-logo.svg'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || ''

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'configured' | 'blank'>('all')

  // Auth state
  type AuthState =
    | { status: 'loading' }
    | { status: 'unconfigured' }
    | { status: 'unauthenticated' }
    | { status: 'authenticated' }
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Modals
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  // Modal scanner QR code (pour édition rapide d'un sticker physique)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<StickerForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [qrSticker, setQrSticker] = useState<Sticker | null>(null)
  const [saving, setSaving] = useState(false)
  // Ref sur le conteneur du QR SVG pour permettre le download PNG local
  const qrSvgRef = useRef<HTMLDivElement>(null)
  // Stats détaillées (top stickers + activité récente)
  const [statsData, setStatsData] = useState<StatsPayload | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Récupérer la liste des stickers
  const fetchStickers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stickers', { cache: 'no-store' })
      if (res.status === 401) {
        setAuthState({ status: 'unauthenticated' })
        setStickers([])
        return
      }
      if (res.status === 503) {
        setAuthState({ status: 'unconfigured' })
        setStickers([])
        return
      }
      if (!res.ok) throw new Error('Erreur réseau')
      const data = await res.json()
      setStickers(data)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les stickers.',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Vérifier l'auth au montage
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check', { cache: 'no-store' })
      if (!res.ok) {
        setAuthState({ status: 'unauthenticated' })
        return
      }
      const data: { configured: boolean; authenticated: boolean } = await res.json()
      if (!data.configured) {
        setAuthState({ status: 'unconfigured' })
      } else if (data.authenticated) {
        setAuthState({ status: 'authenticated' })
      } else {
        setAuthState({ status: 'unauthenticated' })
      }
    } catch {
      setAuthState({ status: 'unauthenticated' })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Charger les stickers quand authentifié
  useEffect(() => {
    if (authState.status === 'authenticated') {
      fetchStickers()
    }
  }, [authState.status, fetchStickers])

  // Récupérer les statistiques (top stickers + activité récente)
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' })
      if (res.status === 401) {
        setAuthState({ status: 'unauthenticated' })
        return
      }
      if (!res.ok) throw new Error('Erreur réseau')
      const data: StatsPayload = await res.json()
      setStatsData(data)
    } catch {
      // Silencieux — pas de toast pour ne pas polluer
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authState.status === 'authenticated') {
      fetchStats()
    }
  }, [authState.status, fetchStats])

  // Re-charger les stats après modification d'un sticker ou scan test via curl
  // (rafraîchissement manuel via le bouton "Rafraîchir" dans la section stats)

  // Connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginLoading || !loginPassword) return
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Connexion échouée',
          description:
            typeof data.error === 'string' ? data.error : 'Mot de passe incorrect',
        })
        return
      }
      toast({ title: 'Connecté', description: 'Bienvenue dans l\'interface admin.' })
      setLoginPassword('')
      setAuthState({ status: 'authenticated' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de contacter le serveur.',
      })
    } finally {
      setLoginLoading(false)
    }
  }

  // Déconnexion
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast({ title: 'Déconnecté' })
      setStickers([])
      setAuthState({ status: 'unauthenticated' })
      router.refresh()
    } catch {
      // ignore
    }
  }

  // Filtrer la liste
  const filtered = useMemo(() => {
    return stickers.filter((s) => {
      const matchesSearch =
        !search ||
        s.slug.toLowerCase().includes(search.toLowerCase()) ||
        (s.label?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (s.targetUrl?.toLowerCase().includes(search.toLowerCase()) ?? false)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'configured' && !!s.targetUrl) ||
        (filter === 'blank' && !s.targetUrl)

      return matchesSearch && matchesFilter
    })
  }, [stickers, search, filter])

  // Stats
  const stats = useMemo(
    () => ({
      total: stickers.length,
      configured: stickers.filter((s) => !!s.targetUrl).length,
      blank: stickers.filter((s) => !s.targetUrl).length,
      totalScans: stickers.reduce((acc, s) => acc + s.scanCount, 0),
    }),
    [stickers]
  )

  // URL publique complète du sticker
  const getPublicUrl = (slug: string) => {
    if (typeof window === 'undefined') return `/api/r/${slug}`
    return `${window.location.origin}/api/r/${slug}`
  }

  // Ouvrir le modal d'édition (création ou édition)
  const openEdit = (sticker?: Sticker) => {
    if (sticker) {
      setEditingId(sticker.id)
      setForm({
        label: sticker.label ?? '',
        targetUrl: sticker.targetUrl ?? '',
        slug: sticker.slug,
        active: sticker.active,
        customActionText: sticker.customActionText ?? '',
        customNetwork:
          (sticker.customNetwork as StickerForm['customNetwork']) ?? 'auto',
      })
    } else {
      setEditingId(null)
      setForm(EMPTY_FORM)
    }
    setEditOpen(true)
  }

  // Quand un slug est scanné (caméra) ou saisi manuellement → ouvrir l'édition
  // Retourne true si un sticker correspondant a été trouvé (le modal s'ouvre),
  // false sinon (le scanner reste ouvert avec un message d'erreur).
  const handleSlugScanned = (slug: string): boolean => {
    const sticker = stickers.find(
      (s) => s.slug.toLowerCase() === slug.toLowerCase()
    )
    if (!sticker) {
      return false
    }
    // Ouvrir le modal d'édition du sticker trouvé
    openEdit(sticker)
    toast({
      title: 'Sticker trouvé',
      description: `Slug "${slug}" — ouverture de l'édition.`,
    })
    return true
  }

  // Sauvegarder (création ou update)
  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const payload = {
        label: form.label.trim() || undefined,
        targetUrl: form.targetUrl.trim() || undefined,
        slug: form.slug.trim() || undefined,
        active: form.active,
        customActionText: form.customActionText.trim() || null,
        customNetwork: form.customNetwork === 'auto' ? null : form.customNetwork,
      }

      const url = editingId
        ? `/api/stickers/${editingId}`
        : '/api/stickers'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        setEditOpen(false)
        setAuthState({ status: 'unauthenticated' })
        toast({
          variant: 'destructive',
          title: 'Session expirée',
          description: 'Veuillez vous reconnecter.',
        })
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur lors de la sauvegarde')
      }

      toast({
        title: editingId ? 'Sticker mis à jour' : 'Sticker créé',
        description: `Le lien a été ${editingId ? 'modifié' : 'créé'} avec succès.`,
      })

      setEditOpen(false)
      await fetchStickers()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
      })
    } finally {
      setSaving(false)
    }
  }

  // Supprimer
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/stickers/${deleteId}`, {
        method: 'DELETE',
      })
      if (res.status === 401) {
        setDeleteId(null)
        setAuthState({ status: 'unauthenticated' })
        toast({
          variant: 'destructive',
          title: 'Session expirée',
          description: 'Veuillez vous reconnecter.',
        })
        return
      }
      if (!res.ok) throw new Error('Erreur lors de la suppression')

      toast({ title: 'Sticker supprimé' })
      setDeleteId(null)
      await fetchStickers()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
      })
    }
  }

  // Copier l'URL publique dans le presse-papier
  const copyPublicUrl = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(getPublicUrl(slug))
      toast({ title: 'URL copiée', description: 'Prête à coller dans un générateur de QR code.' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Impossible de copier',
      })
    }
  }

  // Ouvrir modal QR
  const openQr = (s: Sticker) => {
    setQrSticker(s)
    setQrOpen(true)
  }

  // Ouvrir l'URL cible dans un nouvel onglet
  const openTarget = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Télécharger le sticker complet (10×10 cm @ 300 DPI = 1181×1181 px).
  // Récupère le SVG du QR depuis le DOM, l'injecte dans le template du sticker,
  // convertit le SVG final en PNG via canvas (vectoriel → pas de pixelisation).
  // Aucune dépendance à une API externe (compatible Railway, Vercel, Docker, etc.).
  const downloadStickerPng = async (sticker: Sticker) => {
    try {
      const svgEl = qrSvgRef.current?.querySelector('svg')
      if (!svgEl) {
        throw new Error('QR code non trouvé dans le DOM')
      }

      // Sérialiser le SVG du QR
      const qrSvgString = new XMLSerializer().serializeToString(svgEl)

      // Réseau effectif (custom si fourni, sinon auto-détecté)
      const network: Network = getEffectiveNetwork(
        sticker.targetUrl,
        sticker.customNetwork ?? null
      )

      // Générer le SVG complet du sticker
      const stickerSvg = renderStickerSvg({
        qrSvgString,
        network,
        publicUrl: getPublicUrl(sticker.slug),
        brandName: BRAND_NAME,
        brandLogoUrl: BRAND_LOGO_URL,
        brandPhone: BRAND_PHONE,
        baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        customActionText: sticker.customActionText ?? null,
      })

      // Convertir SVG → Image → Canvas → PNG
      const stickerBlob = new Blob([stickerSvg], {
        type: 'image/svg+xml;charset=utf-8',
      })
      const stickerUrl = URL.createObjectURL(stickerBlob)

      const STICKER_SIZE = 1181 // 10 cm @ 300 DPI

      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = STICKER_SIZE
          canvas.height = STICKER_SIZE
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas non supporté'))
            return
          }
          // Dessiner le sticker à pleine résolution
          ctx.drawImage(img, 0, 0, STICKER_SIZE, STICKER_SIZE)

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Échec de génération du PNG'))
              return
            }
            const dlUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = dlUrl
            a.download = `sticker-${sticker.slug}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(dlUrl)
            URL.revokeObjectURL(stickerUrl)
            resolve()
          }, 'image/png')
        }
        img.onerror = () => {
          URL.revokeObjectURL(stickerUrl)
          reject(new Error('Échec de rendu du SVG'))
        }
        img.src = stickerUrl
      })

      toast({
        title: 'Sticker téléchargé',
        description: `sticker-${sticker.slug}.png (10×10 cm, 300 DPI)`,
      })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Téléchargement impossible',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
      })
    }
  }

  // Écran de chargement pendant la vérification de session
  if (authState.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center text-zinc-400">
          <Loader2 size={28} className="animate-spin mb-3" />
          <p className="text-sm">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  // Écran d'erreur de configuration
  if (authState.status === 'unconfigured') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <Card className="max-w-md w-full bg-white border-zinc-200">
          <CardHeader>
            <CardTitle className="text-zinc-900">Authentification non configurée</CardTitle>
            <CardDescription>
              La variable d&apos;environnement <code className="px-1 py-0.5 bg-zinc-100 rounded text-xs font-mono">ADMIN_PASSWORD</code> n&apos;est pas définie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <p>
              Pour activer l&apos;authentification, ajoutez dans votre fichier <code className="px-1 py-0.5 bg-zinc-100 rounded text-xs font-mono">.env</code> :
            </p>
            <pre className="bg-zinc-900 text-zinc-100 text-xs p-3 rounded overflow-x-auto">
{`ADMIN_PASSWORD=votre-mot-de-passe-secret`}
            </pre>
            <p>
              Puis redémarrez le serveur de développement.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Écran de connexion
  if (authState.status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <Card className="max-w-md w-full bg-white border-zinc-200">
          <CardHeader className="space-y-3 text-center">
            {/* Logo de marque en grand, sur fond sombre */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center p-3 shadow-lg shadow-zinc-900/20">
              <img
                src={BRAND_LOGO_URL}
                alt={`Logo ${BRAND_NAME}`}
                width={48}
                height={48}
                className="w-full h-full"
              />
            </div>
            <div>
              <CardTitle className="text-zinc-900 text-2xl tracking-tight">
                {BRAND_NAME}
              </CardTitle>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">
                Accès administrateur
              </p>
            </div>
            <CardDescription>
              Saisissez le mot de passe pour gérer les stickers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loginLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loginLoading || !loginPassword}
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={16} className="mr-1.5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Rendu principal (authentifié)
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo de marque dans un conteneur sombre pour le contraste sur fond blanc */}
            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center p-1.5 shrink-0">
              <img
                src={BRAND_LOGO_URL}
                alt={`Logo ${BRAND_NAME}`}
                width={32}
                height={32}
                className="w-full h-full"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                {BRAND_NAME}
              </h1>
              <p className="text-xs text-zinc-500">
                Gérez les redirections de vos stickers QR
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setScannerOpen(true)}
              variant="outline"
              className="self-start sm:self-auto"
              title="Scanner un sticker physique pour l'éditer"
            >
              <ScanLine size={16} className="mr-1.5" />
              Scanner
            </Button>
            <Button onClick={() => openEdit()} className="self-start sm:self-auto">
              <Plus size={16} className="mr-1.5" />
              Nouveau sticker
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="icon"
              title="Se déconnecter"
              className="shrink-0"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Stickers"
            value={stats.total}
            icon={<StickyNote size={16} />}
          />
          <StatCard
            label="Configurés"
            value={stats.configured}
            icon={<Globe size={16} />}
            tone="green"
          />
          <StatCard
            label="Vierges"
            value={stats.blank}
            icon={<EyeOff size={16} />}
            tone="amber"
          />
          <StatCard
            label="Scans totaux"
            value={stats.totalScans}
            icon={<MousePointerClick size={16} />}
            tone="blue"
          />
        </div>

        {/* Filtres + recherche */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              placeholder="Rechercher par slug, label ou URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex gap-1.5 bg-white rounded-lg border border-zinc-200 p-1">
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              Tous
            </FilterButton>
            <FilterButton
              active={filter === 'configured'}
              onClick={() => setFilter('configured')}
            >
              Configurés
            </FilterButton>
            <FilterButton
              active={filter === 'blank'}
              onClick={() => setFilter('blank')}
            >
              Vierges
            </FilterButton>
          </div>
        </div>

        {/* Liste */}
        <Card className="bg-white border-zinc-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <Loader2 size={24} className="animate-spin mb-2" />
                <p className="text-sm">Chargement des stickers...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <StickyNote size={32} className="mb-3 opacity-40" />
                <p className="text-sm">
                  {stickers.length === 0
                    ? 'Aucun sticker pour le moment. Cliquez sur "Nouveau sticker" pour commencer.'
                    : 'Aucun sticker ne correspond à votre recherche.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <div className="divide-y divide-zinc-100">
                  {filtered.map((s) => (
                    <StickerRow
                      key={s.id}
                      sticker={s}
                      onEdit={() => openEdit(s)}
                      onDelete={() => setDeleteId(s.id)}
                      onQr={() => openQr(s)}
                      onCopyUrl={() => copyPublicUrl(s.slug)}
                      onOpenTarget={() => s.targetUrl && openTarget(s.targetUrl)}
                      publicUrl={getPublicUrl(s.slug)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Section Statistiques détaillées */}
        <StatsDetailSection
          stats={statsData}
          loading={statsLoading}
          onRefresh={fetchStats}
          onOpenSticker={(slug) => {
            // Ouvrir le modal QR du sticker
            const sticker = stickers.find((s) => s.slug === slug)
            if (sticker) {
              setQrSticker(sticker)
              setQrOpen(true)
            }
          }}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <img
            src={BRAND_LOGO_URL}
            alt=""
            width={14}
            height={14}
            className="opacity-60"
            aria-hidden="true"
          />
          <span>
            {BRAND_NAME} — chaque sticker est accessible via{' '}
            <code className="text-zinc-600">/api/r/&lt;slug&gt;</code>
          </span>
        </div>
      </footer>

      {/* Modal d'édition / création */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le sticker' : 'Nouveau sticker'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Changez l\'URL de redirection, le label ou le statut. Laissez l\'URL vide pour un sticker vierge.'
                : 'Créez un sticker vierge (sans URL) ou configurez-le immédiatement. Le slug est généré automatiquement si vous n\'en indiquez pas.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Label (optionnel)</Label>
              <Input
                id="label"
                placeholder="Ex : Sticker stand salon B26"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetUrl">URL cible</Label>
              <Input
                id="targetUrl"
                placeholder="https://www.tiktok.com/@votre-compte"
                value={form.targetUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetUrl: e.target.value }))
                }
              />
              <p className="text-xs text-zinc-500">
                Laissez vide pour un sticker non configuré (redirige vers la page d&apos;attente).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug personnalisé (optionnel)</Label>
              <Input
                id="slug"
                placeholder="auto-généré si vide"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                disabled={!!editingId}
              />
              {editingId && (
                <p className="text-xs text-amber-600">
                  Le slug ne peut pas être modifié après création (il est encodé dans le QR code physique).
                </p>
              )}
            </div>

            {/* Réseau (auto-détecté ou forcé) */}
            <div className="space-y-1.5">
              <Label htmlFor="customNetwork">Réseau affiché sur le sticker</Label>
              <select
                id="customNetwork"
                value={form.customNetwork}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customNetwork: e.target
                      .value as StickerForm['customNetwork'],
                  }))
                }
                className="w-full px-3 py-2 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              >
                <option value="auto">
                  Auto-détecté depuis l&apos;URL{form.targetUrl ? ` (${detectNetwork(form.targetUrl) || 'aucun réseau détecté'})` : ''}
                </option>
                <option value="google">Google (logo G + texte par défaut)</option>
                <option value="tiktok">TikTok (logo note + texte par défaut)</option>
                <option value="instagram">Instagram (logo caméra + texte par défaut)</option>
                <option value="none">Aucun logo (sticker générique)</option>
              </select>
              <p className="text-xs text-zinc-500">
                Force le logo affiché en haut du sticker. « Auto » détecte depuis l&apos;URL cible.
              </p>
            </div>

            {/* Texte d'action personnalisé */}
            <div className="space-y-1.5">
              <Label htmlFor="customActionText">
                Texte d&apos;action personnalisé <span className="text-zinc-400 font-normal">(optionnel)</span>
              </Label>
              <Input
                id="customActionText"
                placeholder={(() => {
                  const net = form.customNetwork === 'auto'
                    ? detectNetwork(form.targetUrl)
                    : form.customNetwork === 'none'
                      ? null
                      : form.customNetwork
                  return net ? NETWORKS[net].action : 'Scannez ce QR code'
                })()}
                value={form.customActionText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customActionText: e.target.value }))
                }
              />
              <p className="text-xs text-zinc-500">
                Laisse vide pour utiliser le texte par défaut du réseau. Sinon, tape ton propre message
                (ex : « Notez-nous 5 étoiles sur Google ! ⭐ », « Suis-nous sur TikTok 🎵 »).
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
              <div>
                <Label htmlFor="active" className="text-sm font-medium">
                  Sticker actif
                </Label>
                <p className="text-xs text-zinc-500">
                  Désactivé = redirige vers page d&apos;attente même si URL configurée
                </p>
              </div>
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, active: c }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-1.5 animate-spin" />
                  Sauvegarde...
                </>
              ) : editingId ? (
                'Enregistrer'
              ) : (
                'Créer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal QR code → Sticker complet */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aperçu du sticker</DialogTitle>
            <DialogDescription>
              Format 10×10 cm prêt à imprimer. Le PNG exporté est en 300 DPI (1181×1181 px).
            </DialogDescription>
          </DialogHeader>
          {qrSticker && (
            <div className="flex flex-col items-center py-2">
              {/* QR code caché : sert de source pour la génération du sticker PNG.
                  Ne PAS supprimer, le ref est lu par downloadStickerPng(). */}
              <div
                ref={qrSvgRef}
                aria-hidden="true"
                style={{ position: 'absolute', left: -9999, top: -9999 }}
              >
                <QRCodeSVG
                  value={getPublicUrl(qrSticker.slug)}
                  size={280}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Preview du sticker complet (rendu via renderStickerSvg) */}
              <StickerPreview
                sticker={qrSticker}
                publicUrl={getPublicUrl(qrSticker.slug)}
                qrRef={qrSvgRef}
              />

              {/* Badge réseau détecté */}
              {(() => {
                const net = detectNetwork(qrSticker.targetUrl)
                return (
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <span>Réseau détecté :</span>
                    {net ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${NETWORKS[net].accent}15`,
                          color: NETWORKS[net].accent,
                        }}
                      >
                        {net}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Aucun (générique)</span>
                    )}
                  </div>
                )
              })()}

              {/* URL publique (info) */}
              <div className="mt-3 text-center w-full">
                <p className="text-xs text-zinc-500 mb-1">URL publique scannable</p>
                <code className="block text-xs font-mono text-zinc-700 break-all bg-zinc-50 px-3 py-2 rounded border border-zinc-200">
                  {getPublicUrl(qrSticker.slug)}
                </code>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyPublicUrl(qrSticker.slug)}
                >
                  <Copy size={14} className="mr-1.5" />
                  Copier l&apos;URL
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => downloadStickerPng(qrSticker)}
                >
                  <Download size={14} className="mr-1.5" />
                  Télécharger le sticker
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Scanner QR code (caméra) */}
      <ScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSlugScanned={handleSlugScanned}
      />

      {/* Confirmation de suppression */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce sticker ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Si ce sticker est déjà imprimé sur un
              QR code physique, le scan ne fonctionnera plus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}

/* ---------------- Sous-composants ---------------- */

/**
 * Section "Statistiques détaillées" — affichée après la liste des stickers.
 * Contient :
 *   - Top 5 stickers par scans (avec barres horizontales relatives)
 *   - Activité récente : 5 derniers scans (slug + timestamp + label)
 *
 * Bouton "Rafraîchir" pour re-fetcher les stats (utile après un scan de test).
 */
function StatsDetailSection({
  stats,
  loading,
  onRefresh,
  onOpenSticker,
}: {
  stats: StatsPayload | null
  loading: boolean
  onRefresh: () => void
  onOpenSticker: (slug: string) => void
}) {
  // Calcul du max pour les barres horizontales (Top stickers)
  const maxScans =
    stats?.topStickers?.reduce(
      (max, s) => Math.max(max, s.scanCount),
      0
    ) || 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* Top stickers */}
      <Card className="bg-white border-zinc-200">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Top 5 stickers
            </CardTitle>
            <CardDescription className="text-xs">
              Classés par nombre de scans
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            title="Rafraîchir les statistiques"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshIcon size={14} />
            )}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {!stats || stats.topStickers.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center">
              Aucun sticker scanné pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topStickers.map((s, i) => {
                const pct =
                  maxScans > 0 ? Math.round((s.scanCount / maxScans) * 100) : 0
                return (
                  <button
                    key={s.slug}
                    onClick={() => onOpenSticker(s.slug)}
                    className="w-full text-left hover:bg-zinc-50 rounded-lg p-2 -m-2 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0
                            ? 'bg-amber-100 text-amber-700'
                            : i === 1
                              ? 'bg-zinc-200 text-zinc-700'
                              : i === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <code className="text-sm font-mono font-medium text-zinc-900 truncate group-hover:underline">
                            {s.slug}
                          </code>
                          <span className="text-xs font-semibold text-zinc-600 shrink-0">
                            {s.scanCount} scan{s.scanCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        {s.label && (
                          <p className="text-xs text-zinc-500 truncate mb-1.5">
                            {s.label}
                          </p>
                        )}
                        {/* Barre horizontale relative */}
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activité récente */}
      <Card className="bg-white border-zinc-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Activité récente
          </CardTitle>
          <CardDescription className="text-xs">
            Les 5 derniers scans
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {!stats || stats.recentScans.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center">
              Aucune activité récente
            </p>
          ) : (
            <div className="space-y-2.5">
              {stats.recentScans.map((scan, i) => (
                <div
                  key={`${scan.slug}-${scan.ts}-${i}`}
                  className="flex items-start gap-3 py-1.5 border-b border-zinc-50 last:border-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <code className="text-xs font-mono font-medium text-zinc-900 truncate">
                        {scan.slug}
                      </code>
                      <span className="text-xs text-zinc-400 shrink-0 font-mono">
                        {formatRelativeTime(scan.ts)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {scan.label ? (
                        <span>{scan.label} · </span>
                      ) : null}
                      <span className="text-zinc-400">
                        → {scan.targetUrl || '(non configuré)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Formate un timestamp ISO en "il y a X" relatif. */
function formatRelativeTime(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  if (Number.isNaN(diffMs)) return ''
  if (diffMs < 60_000) return 'à l\'instant'
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 30) return `il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR')
}

/** Icône Refresh custom (évite un import supplémentaire de lucide). */
function RefreshIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

/**
 * Preview du sticker complet (rendu via renderStickerSvg injecté comme innerHTML).
 * Le SVG est mis à l'échelle via CSS (max-w-full) pour s'adapter au conteneur.
 *
 * @param sticker Le sticker (pour détecter le réseau)
 * @param publicUrl URL publique complète (à afficher sous le QR)
 * @param qrRef Ref vers le QR code caché dans le DOM (pour récupérer le SVG)
 */
function StickerPreview({
  sticker,
  publicUrl,
  qrRef,
}: {
  sticker: Sticker
  publicUrl: string
  qrRef: React.RefObject<HTMLDivElement | null>
}) {
  const [svgHtml, setSvgHtml] = useState<string>('')

  useEffect(() => {
    // Attendre que le QR code caché soit dans le DOM (1 rafFrame suffit en général)
    const raf = requestAnimationFrame(() => {
      const svgEl = qrRef.current?.querySelector('svg')
      if (!svgEl) {
        setSvgHtml('')
        return
      }
      const qrSvgString = new XMLSerializer().serializeToString(svgEl)
      const network = getEffectiveNetwork(
        sticker.targetUrl,
        sticker.customNetwork ?? null
      )
      const stickerSvg = renderStickerSvg({
        qrSvgString,
        network,
        publicUrl,
        brandName: BRAND_NAME,
        brandLogoUrl: BRAND_LOGO_URL,
        brandPhone: BRAND_PHONE,
        baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        customActionText: sticker.customActionText ?? null,
      })
      setSvgHtml(stickerSvg)
    })
    return () => cancelAnimationFrame(raf)
  }, [sticker, publicUrl, qrRef])

  if (!svgHtml) {
    return (
      <div className="w-full aspect-square max-w-[280px] mx-auto bg-zinc-100 rounded-xl animate-pulse" />
    )
  }

  // Le SVG 1181×1181 est mis à l'échelle via CSS max-w-full + aspect-square
  // + height: auto pour préserver les ratios
  return (
    <div
      className="w-full max-w-[320px] mx-auto bg-white rounded-xl overflow-hidden border border-zinc-200 shadow-sm"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
      style={{ aspectRatio: '1 / 1' }}
    />
  )
}

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone?: 'default' | 'green' | 'amber' | 'blue'
}) {
  const toneClass = {
    default: 'bg-zinc-100 text-zinc-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-sky-100 text-sky-700',
  }[tone]

  return (
    <Card className="bg-white border-zinc-200">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 leading-tight">
            {value}
          </p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneClass}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}

function StickerRow({
  sticker,
  onEdit,
  onDelete,
  onQr,
  onCopyUrl,
  onOpenTarget,
  publicUrl,
}: {
  sticker: Sticker
  onEdit: () => void
  onDelete: () => void
  onQr: () => void
  onCopyUrl: () => void
  onOpenTarget: () => void
  publicUrl: string
}) {
  const [showUrl, setShowUrl] = useState(false)

  return (
    <div className="p-4 hover:bg-zinc-50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Identité */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <code className="text-sm font-mono font-semibold text-zinc-900">
              {sticker.slug}
            </code>
            {sticker.label && (
              <span className="text-sm text-zinc-600 truncate">
                — {sticker.label}
              </span>
            )}
            {!sticker.active && (
              <Badge variant="outline" className="text-zinc-500 border-zinc-300">
                Inactif
              </Badge>
            )}
            {sticker.targetUrl ? (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                Configuré
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                Vierge
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button
              onClick={() => setShowUrl((v) => !v)}
              className="inline-flex items-center gap-1 hover:text-zinc-700 transition-colors"
            >
              {showUrl ? <EyeOff size={12} /> : <Eye size={12} />}
              {showUrl ? 'Masquer l\'URL' : 'Afficher l\'URL publique'}
            </button>
            <span>·</span>
            <span>{sticker.scanCount} scan{sticker.scanCount > 1 ? 's' : ''}</span>
          </div>
          {showUrl && (
            <code className="block text-xs font-mono text-zinc-600 mt-1.5 break-all bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
              {publicUrl}
            </code>
          )}
          {sticker.targetUrl && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400">→</span>
              <a
                href={sticker.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline truncate max-w-full"
              >
                {sticker.targetUrl}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {sticker.targetUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenTarget}
              title="Ouvrir l'URL cible"
            >
              <ExternalLink size={14} />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onQr}
            title="Voir le QR code"
          >
            <QrCode size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCopyUrl}
            title="Copier l'URL publique"
          >
            <Copy size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            title="Modifier"
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            title="Supprimer"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Petit composant icône Download locale (Lucide a déjà Download, mais pour éviter de l'importer en haut)
function Download({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
