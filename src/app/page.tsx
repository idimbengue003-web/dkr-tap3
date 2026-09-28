'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Eye,
  EyeOff,
  MousePointerClick,
  Globe,
  StickyNote,
  Lock,
  LogOut,
} from 'lucide-react'

type Sticker = {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  scanCount: number
  active: boolean
  createdAt: string
  updatedAt: string
}

type StickerForm = {
  label: string
  targetUrl: string
  slug: string
  active: boolean
}

const EMPTY_FORM: StickerForm = {
  label: '',
  targetUrl: '',
  slug: '',
  active: true,
}

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
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<StickerForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [qrSticker, setQrSticker] = useState<Sticker | null>(null)
  const [saving, setSaving] = useState(false)

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
      })
    } else {
      setEditingId(null)
      setForm(EMPTY_FORM)
    }
    setEditOpen(true)
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
            <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
              <Lock size={22} />
            </div>
            <CardTitle className="text-zinc-900">Accès réservé</CardTitle>
            <CardDescription>
              Saisissez le mot de passe administrateur pour gérer les stickers.
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
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
              <LinkIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">QR Passerelle</h1>
              <p className="text-xs text-zinc-500">
                Gérez les redirections de vos stickers QR
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-zinc-400">
          QR Passerelle — chaque sticker est accessible via{' '}
          <code className="text-zinc-600">/api/r/&lt;slug&gt;</code>
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

      {/* Modal QR code */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR code du sticker</DialogTitle>
            <DialogDescription>
              Imprimez ce QR code et collez-le sur votre sticker physique.
              Scannez-le pour être redirigé vers l&apos;URL configurée.
            </DialogDescription>
          </DialogHeader>
          {qrSticker && (
            <div className="flex flex-col items-center py-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(
                    getPublicUrl(qrSticker.slug)
                  )}`}
                  alt={`QR code ${qrSticker.slug}`}
                  width={280}
                  height={280}
                  className="rounded"
                />
              </div>
              <div className="mt-4 text-center w-full">
                <p className="text-xs text-zinc-500 mb-1">URL publique</p>
                <code className="block text-xs font-mono text-zinc-700 break-all bg-zinc-50 px-3 py-2 rounded border border-zinc-200">
                  {getPublicUrl(qrSticker.slug)}
                </code>
              </div>
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
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&margin=8&data=${encodeURIComponent(
                    getPublicUrl(qrSticker.slug)
                  )}`}
                  download={`qr-${qrSticker.slug}.png`}
                  className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                >
                  <Download size={14} className="mr-1.5" />
                  Télécharger PNG
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
