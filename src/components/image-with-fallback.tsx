'use client'

/**
 * Affiche une image avec un fallback si l'image n'existe pas.
 * Client Component car onError nécessite du JavaScript côté client.
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackText,
  className = '',
}: {
  src: string
  alt: string
  fallbackText: string
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const el = e.currentTarget
        el.style.display = 'none'
        const parent = el.parentElement
        if (parent) {
          parent.innerHTML = `<div class="text-zinc-600 text-sm text-center py-8">${fallbackText}</div>`
        }
      }}
    />
  )
}
