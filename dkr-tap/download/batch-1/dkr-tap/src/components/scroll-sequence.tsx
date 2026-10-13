'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * 4 frames en séquence (frame 2 "QR illumine" retirée).
 */
export function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const opacity1 = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0])
  const scale1 = useTransform(scrollYProgress, [0, 0.25], [1, 1.08])

  const opacity2 = useTransform(scrollYProgress, [0.20, 0.30, 0.45, 0.50], [0, 1, 1, 0])
  const scale2 = useTransform(scrollYProgress, [0.20, 0.50], [0.95, 1.08])

  const opacity3 = useTransform(scrollYProgress, [0.45, 0.55, 0.70, 0.75], [0, 1, 1, 0])
  const scale3 = useTransform(scrollYProgress, [0.45, 0.75], [0.95, 1.08])

  const opacity4 = useTransform(scrollYProgress, [0.70, 0.82, 1], [0, 1, 1])
  const scale4 = useTransform(scrollYProgress, [0.70, 1], [0.95, 1.05])

  const t1 = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0])
  const t2 = useTransform(scrollYProgress, [0.20, 0.30, 0.45, 0.50], [0, 1, 1, 0])
  const t3 = useTransform(scrollYProgress, [0.45, 0.55, 0.70, 0.75], [0, 1, 1, 0])
  const t4 = useTransform(scrollYProgress, [0.70, 0.82, 1], [0, 1, 1])

  const frames = [
    { src: '/scroll-1.png', alt: 'Sticker sur le mur', opacity: opacity1, scale: scale1 },
    { src: '/scroll-2.png', alt: 'Scan du QR code', opacity: opacity2, scale: scale2 },
    { src: '/scroll-5.png', alt: 'Notification recue', opacity: opacity3, scale: scale3 },
    { src: '/scroll-3.png', alt: 'App reseau social ouverte', opacity: opacity4, scale: scale4 },
  ]

  const texts = [
    { text: '1. Le sticker est sur le mur', opacity: t1 },
    { text: '2. Le client scanne le code', opacity: t2 },
    { text: '3. Notification de redirection', opacity: t3 },
    { text: '4. Redirection vers votre page', opacity: t4 },
  ]

  return (
    <section ref={containerRef} className="relative" style={{ height: '250vh' }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />

        {frames.map((f, i) => (
          <motion.div key={i} className="absolute inset-0" style={{ opacity: f.opacity, scale: f.scale }}>
            <img src={f.src} alt={f.alt} className="w-full h-full object-cover" />
          </motion.div>
        ))}

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
