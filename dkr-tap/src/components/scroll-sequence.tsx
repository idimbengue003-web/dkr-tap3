'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'

export function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // UN seul texte — change selon la position de scroll (pas de chevauchement)
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (v < 0.22) setStep(0)
    else if (v < 0.47) setStep(1)
    else if (v < 0.72) setStep(2)
    else setStep(3)
  })

  const steps = [
    '1. Le sticker est sur le mur',
    '2. Le client scanne le code',
    '3. Notification de redirection',
    '4. Redirection vers votre page',
  ]

  // Images : crossfade entre frames (OK pour les images)
  const opacity1 = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0])
  const scale1 = useTransform(scrollYProgress, [0, 0.25], [1, 1.08])

  const opacity2 = useTransform(scrollYProgress, [0.20, 0.30, 0.45, 0.50], [0, 1, 1, 0])
  const scale2 = useTransform(scrollYProgress, [0.20, 0.50], [0.95, 1.08])

  const opacity3 = useTransform(scrollYProgress, [0.45, 0.55, 0.70, 0.75], [0, 1, 1, 0])
  const scale3 = useTransform(scrollYProgress, [0.45, 0.75], [0.95, 1.08])

  const opacity4 = useTransform(scrollYProgress, [0.70, 0.82, 1], [0, 1, 1])
  const scale4 = useTransform(scrollYProgress, [0.70, 1], [0.95, 1.05])

  const frames = [
    { src: '/scroll-1.png', alt: 'Sticker sur le mur', opacity: opacity1, scale: scale1 },
    { src: '/scroll-2.png', alt: 'Scan du QR code', opacity: opacity2, scale: scale2 },
    { src: '/scroll-5.png', alt: 'Notification recue', opacity: opacity3, scale: scale3 },
    { src: '/scroll-3.png', alt: 'App reseau social', opacity: opacity4, scale: scale4 },
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

        {/* UN seul texte — pas de chevauchement possible */}
        <div className="absolute bottom-16 left-0 right-0 text-center px-4">
          <p className="text-xl sm:text-3xl font-bold text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
            {steps[step]}
          </p>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: useTransform(scrollYProgress, [0, 1], ['0%', '100%']) }}
          />
        </div>
      </div>
    </section>
  )
}
