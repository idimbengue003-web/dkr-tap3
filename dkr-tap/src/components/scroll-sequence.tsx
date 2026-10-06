'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * Section scroll-driven qui affiche 5 images en séquence.
 * Au fur et à mesure que l'utilisateur défile, les images se succèdent
 * en crossfade, créant un effet "vidéo" de progression.
 *
 * 5 frames :
 *   1. Sticker sur le mur, téléphone qui s'approche
 *   2. Zoom sur le QR qui s'illumine
 *   3. Le téléphone scanne, flash vert
 *   4. Notification de redirection sur le téléphone
 *   5. L'app réseau social s'ouvre
 */
export function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // 5 frames → 5 segments de scroll
  // Frame 1 : 0 → 0.18
  const opacity1 = useTransform(scrollYProgress, [0, 0.12, 0.18], [1, 1, 0])
  const scale1 = useTransform(scrollYProgress, [0, 0.18], [1, 1.08])

  // Frame 2 : 0.14 → 0.34
  const opacity2 = useTransform(scrollYProgress, [0.14, 0.22, 0.28, 0.34], [0, 1, 1, 0])
  const scale2 = useTransform(scrollYProgress, [0.14, 0.34], [0.95, 1.08])

  // Frame 3 : 0.30 → 0.52
  const opacity3 = useTransform(scrollYProgress, [0.30, 0.38, 0.46, 0.52], [0, 1, 1, 0])
  const scale3 = useTransform(scrollYProgress, [0.30, 0.52], [0.95, 1.08])

  // Frame 4 : 0.48 → 0.72
  const opacity4 = useTransform(scrollYProgress, [0.48, 0.56, 0.66, 0.72], [0, 1, 1, 0])
  const scale4 = useTransform(scrollYProgress, [0.48, 0.72], [0.95, 1.08])

  // Frame 5 : 0.68 → 1
  const opacity5 = useTransform(scrollYProgress, [0.68, 0.78, 1], [0, 1, 1])
  const scale5 = useTransform(scrollYProgress, [0.68, 1], [0.95, 1.05])

  // Textes qui changent
  const t1 = useTransform(scrollYProgress, [0, 0.12, 0.18], [1, 1, 0])
  const t2 = useTransform(scrollYProgress, [0.14, 0.22, 0.28, 0.34], [0, 1, 1, 0])
  const t3 = useTransform(scrollYProgress, [0.30, 0.38, 0.46, 0.52], [0, 1, 1, 0])
  const t4 = useTransform(scrollYProgress, [0.48, 0.56, 0.66, 0.72], [0, 1, 1, 0])
  const t5 = useTransform(scrollYProgress, [0.68, 0.78, 1], [0, 1, 1])

  const frames = [
    { src: '/scroll-1.png', alt: 'Sticker QR sur le mur', opacity: opacity1, scale: scale1 },
    { src: '/scroll-4.png', alt: 'QR code qui s\'illumine', opacity: opacity2, scale: scale2 },
    { src: '/scroll-2.png', alt: 'Scan du QR code', opacity: opacity3, scale: scale3 },
    { src: '/scroll-5.png', alt: 'Notification de redirection', opacity: opacity4, scale: scale4 },
    { src: '/scroll-3.png', alt: 'App réseau social ouverte', opacity: opacity5, scale: scale5 },
  ]

  const texts = [
    { text: '1. Le sticker est sur le mur 🏪', opacity: t1 },
    { text: '2. Le QR code s\'illumine ✨', opacity: t2 },
    { text: '3. Le client scanne le code 📱', opacity: t3 },
    { text: '4. Notification reçue 🔔', opacity: t4 },
    { text: '5. Redirection vers votre page ✅', opacity: t5 },
  ]

  return (
    <section ref={containerRef} className="relative" style={{ height: '300vh' }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />

        {/* 5 frames plein écran */}
        {frames.map((f, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{ opacity: f.opacity, scale: f.scale }}
          >
            <img
              src={f.src}
              alt={f.alt}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}

        {/* Texte overlay */}
        <div className="absolute bottom-20 left-0 right-0 text-center px-4">
          {texts.map((t, i) => (
            <motion.p
              key={i}
              className="absolute inset-0 text-xl sm:text-3xl font-bold text-white"
              style={{ opacity: t.opacity, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
            >
              {t.text}
            </motion.p>
          ))}
        </div>

        {/* Barre de progression */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: useTransform(scrollYProgress, [0, 1], ['0%', '100%']) }}
          />
        </div>
      </div>
    </section>
  )
}
