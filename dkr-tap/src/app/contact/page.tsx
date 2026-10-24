'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Phone, Mail, MapPin, Send, Loader2, Check } from 'lucide-react'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = "/dkrtap-logo.png"
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    // Rediriger vers WhatsApp avec le message pré-rempli (pas d'email backend pour l'instant)
    setTimeout(() => {
      const cleaned = BRAND_PHONE.replace(/\D/g, '')
      const phone = cleaned.startsWith('221') ? cleaned : '221' + cleaned
      const msg = `Bonjour DKR TAP,\n\nNom: ${form.name}\nEmail: ${form.email}\n\nMessage: ${form.message}`
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      setSubmitted(true)
      setSubmitting(false)
      setForm({ name: '', email: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Contactez-nous</h1>
        <p className="text-zinc-400 mb-8">
          Une question sur les cartes QR ? Une demande de devis pour une grande quantité ? Écrivez-nous, on répond vite.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <a href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-emerald-500/50 transition-colors">
            <Phone size={24} className="text-emerald-400 mb-2" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Téléphone</p>
            <p className="font-semibold">{BRAND_PHONE}</p>
          </a>
          <a href="https://wa.me/221789271296" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-emerald-500/50 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366" className="mb-2">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.212-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.485-9.885 9.485m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.549 4.142 1.595 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">WhatsApp</p>
            <p className="font-semibold">Écrire un message</p>
          </a>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <Mail size={24} className="text-emerald-400 mb-2" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Email</p>
            <a href="mailto:dkrtap@gmail.com" className="font-semibold text-white hover:text-emerald-400">dkrtap@gmail.com</a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-lg font-bold">Envoyez-nous un message</h2>
          <p className="text-xs text-zinc-500">Votre message sera envoyé via WhatsApp (réponse rapide).</p>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Votre nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Aïssatou Diop"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Votre email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ex: email@gmail.com"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Votre message</label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Bonjour, je souhaite des informations sur..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || submitted}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Ouverture de WhatsApp...</>
              : submitted ? <><Check size={16} /> Message envoyé !</>
              : <><Send size={16} /> Envoyer via WhatsApp</>}
          </button>
        </form>
      </main>
    </div>
  )
}
