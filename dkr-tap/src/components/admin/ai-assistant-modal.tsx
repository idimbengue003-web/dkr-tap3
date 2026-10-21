'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, ImageIcon, Loader2, Copy, Check, Wand2 } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type GeneratedImage = {
  url: string
  prompt: string
}

const QUICK_PROMPTS = [
  {
    label: '🎯 Salon de coiffure',
    prompt: "Je vends une carte à un salon de coiffure dakartois. Quels réseaux sociaux me conseilles-tu et pourquoi ? Donne-moi aussi une description d'annonce accrocheuse pour chaque réseau.",
  },
  {
    label: '🍔 Restaurant',
    prompt: "Client : restaurant à Dakar. Quels réseaux ? Quelle URL Google Reviews je dois configurer ? Donne un call-to-action pour le sticker.",
  },
  {
    label: '🛍️ Boutique mode',
    prompt: "Client : boutique de prêt-à-porter. Quels réseaux pour vendre plus ? Donne-moi 3 descriptions d'annonces différentes.",
  },
  {
    label: '📱 WhatsApp Business',
    prompt: "Comment configurer une carte WhatsApp ? Quelle URL dois-je mettre ? Explique le format wa.me.",
  },
  {
    label: '⭐ Google Reviews',
    prompt: "Donne-moi le script exact pour trouver l'URL de ma fiche Google Maps et la mettre dans une carte DKR TAP.",
  },
  {
    label: '🎨 Texte d\'action',
    prompt: "Donne-moi 5 idées de textes d'action (call-to-action) pour un sticker TikTok. Court, accrocheur, en français sénégalais.",
  },
]

export function AIAssistantModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Salut ! Je suis ton assistant IA DKR TAP. Je peux t'aider à :
- Choisir les bons réseaux pour tes clients
- Écrire des descriptions d'annonces accrocheuses
- Configurer les URLs cibles (Google Reviews, Instagram, etc.)
- Créer des designs de stickers
- Donner des conseils marketing

Clique sur un raccourci ci-dessus ou pose-moi une question libre 👇`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'image'>('chat')

  // États pour la génération d'image
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [imageCopied, setImageCopied] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll auto vers le bas quand nouveaux messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus l'input à l'ouverture
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, activeTab])

  const sendMessage = async (text?: string) => {
    const message = (text ?? input).trim()
    if (!message || loading) return

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: message }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: newMessages.slice(0, -1), // historique sans le dernier message (envoyé dans message)
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec de la requête')
      }
      const data = await res.json()
      setMessages([
        ...newMessages,
        { role: 'assistant', content: data.message },
      ])
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `❌ Désolé, erreur : ${(e as Error).message}. Réessaie.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const generateImage = async () => {
    if (!imagePrompt.trim() || imageLoading) return
    setImageLoading(true)
    setGeneratedImage(null)
    try {
      const res = await fetch('/api/ai/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec')
      }
      const data = await res.json()
      setGeneratedImage({ url: data.imageUrl, prompt: imagePrompt })
    } catch (e) {
      alert('Erreur génération image : ' + (e as Error).message)
    } finally {
      setImageLoading(false)
    }
  }

  const copyImageUrl = () => {
    if (generatedImage) {
      navigator.clipboard.writeText(generatedImage.url)
      setImageCopied(true)
      setTimeout(() => setImageCopied(false), 1500)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            className="bg-white border-t border-zinc-200 sm:border sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Assistant IA DKR TAP</h2>
                  <p className="text-[10px] text-emerald-100">Aide pour cartes et QR codes</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Wand2 size={14} /> Conseils & textes
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  activeTab === 'image' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <ImageIcon size={14} /> Générer un design
              </button>
            </div>

            {/* Content */}
            {activeTab === 'chat' ? (
              <>
                {/* Quick prompts */}
                <div className="p-3 border-b border-zinc-100 bg-zinc-50">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase mb-2">Raccourcis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(p.prompt)}
                        disabled={loading}
                        className="px-2.5 py-1.5 rounded-full bg-white border border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50 text-xs text-zinc-700 disabled:opacity-50 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-emerald-500 text-white rounded-br-sm'
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-zinc-200 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-emerald-500" />
                        <span className="text-xs text-zinc-500">L'IA réfléchit...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-zinc-200 bg-white">
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Pose ta question..."
                      disabled={loading}
                      className="flex-1 px-3 py-2 rounded-full border border-zinc-200 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      aria-label="Envoyer"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Tab 2 : génération d'image */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
                <div>
                  <label className="text-xs text-zinc-700 font-semibold mb-1.5 block">
                    Décris le design que tu veux générer
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={4}
                    placeholder="Ex: Logo stylisé pour salon de coiffure, femme africaine avec tresses, couleurs pastel (rose, lavande), minimaliste, élégant"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Astuce : décris le style (minimaliste, moderne, coloré...), les éléments principaux, et les couleurs souhaitées.
                  </p>
                </div>

                {/* Quick templates */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Logo salon de coiffure élégant, femme avec tresse, couleurs pastel",
                    "Design sticker pour restaurant, plat sénégalais, couleurs chaudes",
                    "Logo boutique de mode, sac à main stylisé, rose et noir",
                    "Design minimaliste QR code, abstract, vert émeraude",
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => setImagePrompt(tpl)}
                      className="px-2 py-1 rounded-full bg-white border border-zinc-200 hover:border-emerald-400 text-[10px] text-zinc-600 text-left"
                    >
                      {tpl.length > 50 ? tpl.slice(0, 50) + '...' : tpl}
                    </button>
                  ))}
                </div>

                <button
                  onClick={generateImage}
                  disabled={imageLoading || !imagePrompt.trim()}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {imageLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Génération en cours... (10-20s)</>
                  ) : (
                    <><Sparkles size={14} /> Générer le design</>
                  )}
                </button>

                {/* Image générée */}
                {generatedImage && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-700">Design généré :</p>
                    <div className="rounded-lg overflow-hidden border border-zinc-200 bg-white">
                      <img src={generatedImage.url} alt={generatedImage.prompt} className="w-full h-auto" />
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={generatedImage.url}
                        download={`dkr-tap-design-${Date.now()}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 rounded-lg bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 text-center"
                      >
                        Télécharger
                      </a>
                      <button
                        onClick={copyImageUrl}
                        className="flex-1 py-2 rounded-lg border border-zinc-200 text-zinc-700 text-xs font-semibold hover:border-emerald-400 flex items-center justify-center gap-1"
                      >
                        {imageCopied ? <><Check size={12} /> Copié !</> : <><Copy size={12} /> Copier URL</>}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Tu peux utiliser cette image comme image d'une catégorie ou d'un modèle dans l'admin.
                    </p>
                  </div>
                )}

                {/* Loading placeholder */}
                {imageLoading && !generatedImage && (
                  <div className="aspect-square rounded-lg bg-zinc-100 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 size={32} className="mx-auto animate-spin text-emerald-500 mb-2" />
                      <p className="text-xs text-zinc-500">Génération de ton design...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
