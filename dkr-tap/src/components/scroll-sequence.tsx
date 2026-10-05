'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * Section scroll-driven qui affiche 3 images en séquence.
 * Au fur et à mesure que l'utilisateur défile, les images se succèdent
 * en crossfade, créant un effet "vidéo" de progression.
 *
 * Utilise Framer Motion (useScroll + useTransform) — compatible mobile.
 */
export function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Opacité de chaque frame selon la position de scroll
  // Frame 1 : visible au début, disparaît vers 33%
  const opacity1 = useTransform(scrollYProgress, [0, 0.25, 0.4], [1, 1, 0])
  // Frame 2 : apparaît à 33%, disparaît à 66%
  const opacity2 = useTransform(scrollYProgress, [0.3, 0.45, 0.6, 0.7], [0, 1, 1, 0])
  // Frame 3 : apparaît à 66%
  const opacity3 = useTransform(scrollYProgress, [0.6, 0.75, 1], [0, 1, 1])

  // Scale subtil pour effet de profondeur
  const scale1 = useTransform(scrollYProgress, [0, 0.4], [1, 1.1])
  const scale2 = useTransform(scrollYProgress, [0.3, 0.7], [0.95, 1.05])
  const scale3 = useTransform(scrollYProgress, [0.6, 1], [0.95, 1.05])

  // Texte qui change avec le scroll
  const text1Opacity = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0])
  const text2Opacity = useTransform(scrollYProgress, [0.35, 0.5, 0.6, 0.65], [0, 1, 1, 0])
  const text3Opacity = useTransform(scrollYProgress, [0.65, 0.8, 1], [0, 1, 1])

  return (
    <section ref={containerRef} className="relative" style={{ height: '200vh' }}>
      {/* Container sticky — reste fixe pendant le scroll */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />

        {/* Frame 1 */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: opacity1, scale: scale1 }}
        >
          <img
            src="/scroll-1.png"
            alt="Sticker QR sur le mur, téléphone qui s'approche"
            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
          />
        </motion.div>

        {/* Frame 2 */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: opacity2, scale: scale2 }}
        >
          <img
            src="/scroll-2.png"
            alt="Scan du QR code, flash vert"
            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
          />
        </motion.div>

        {/* Frame 3 */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: opacity3, scale: scale3 }}
        >
          <img
            src="/scroll-3.png"
            alt="Téléphone redirigé vers le réseau social"
            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
          />
        </motion.div>

        {/* Texte overlay qui change */}
        <div className="absolute bottom-20 left-0 right-0 text-center px-4">
          <motion.p
            className="text-xl sm:text-2xl font-bold text-white"
            style={{ opacity: text1Opacity }}
          >
            1. Le sticker est sur le mur 🏪
          </motion.p>
          <motion.p
            className="absolute inset-0 text-xl sm:text-2xl font-bold text-emerald-400"
            style={{ opacity: text2Opacity }}
          >
            2. Le client scanne le QR code 📱
          </motion.p>
          <motion.p
            className="absolute inset-0 text-xl sm:text-2xl font-bold text-emerald-400"
            style={{ opacity: text3Opacity }}
          >
            3. Redirection vers votre page ✅
          </motion.p>
        </div>

        {/* Indicateur de progression */}
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
