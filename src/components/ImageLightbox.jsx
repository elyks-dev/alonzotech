import { useEffect } from 'react'
import { X } from 'lucide-react'

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-5 motion-safe:animate-in motion-safe:fade-in" onMouseDown={onClose}>
      <button type="button" onClick={onClose} aria-label="Close image" className="absolute right-5 top-5 rounded-full p-2 text-2xl text-white hover:bg-white/10"> <X size={28} /> </button>
      <img src={src} alt={alt} className="max-h-[90vh] max-w-[90vw] object-contain" onMouseDown={(event) => event.stopPropagation()} />
    </div>
  )
}

export default ImageLightbox
