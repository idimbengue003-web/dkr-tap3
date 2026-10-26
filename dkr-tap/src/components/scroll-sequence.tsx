'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'

export function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // 3 frames au lieu de 4
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (v < 0.33) setStep(0)
    else if (v < 0.66) setStep(1)
    else setStep(2)
  })

  const steps = [
    'Le client scanne le code',
    'Notification de redirection',
    'Redirection vers votre page',
  ]

  // Frame 1 : Le client scanne le code (boutique)
  const opacity1 = useTransform(scrollYProgress, [0, 0.20, 0.33], [1, 1, 0])
  const scale1 = useTransform(scrollYProgress, [0, 0.33], [1, 1.08])

  // Frame 2 : Notification de redirection (restaurant)
  const opacity2 = useTransform(scrollYProgress, [0.28, 0.38, 0.55, 0.66], [0, 1, 1, 0])
  const scale2 = useTransform(scrollYProgress, [0.28, 0.66], [0.95, 1.08])

  // Frame 3 : Redirection vers votre page (Instagram)
  const opacity3 = useTransform(scrollYProgress, [0.62, 0.75, 1], [0, 1, 1])
  const scale3 = useTransform(scrollYProgress, [0.62, 1], [0.95, 1.05])

  const frames = [
    { src: '/scroll-scan-boutique.jpg', alt: 'Le client scanne le code QR', opacity: opacity1, scale: scale1 },
    { src: '/scroll-redirect-restaurant.jpg', alt: 'Notification de redirection', opacity: opacity2, scale: scale2 },
    { src: '/scroll-instagram-redirect.jpg', alt: 'Redirection vers Instagram', opacity: opacity3, scale: scale3 },
  ]

  return (
    <section ref={containerRef} className="relative" style={{ height: '200vh' }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />

        {frames.map((f, i) => (
          <motion.div key={i} className="absolute inset-0" style={{ opacity: f.opacity, scale: f.scale }}>
            <img src={f.src} alt={f.alt} className="w-full h-full object-cover" />
          </motion.div>
        ))}

        {/* Texte qui change selon le scroll */}
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
