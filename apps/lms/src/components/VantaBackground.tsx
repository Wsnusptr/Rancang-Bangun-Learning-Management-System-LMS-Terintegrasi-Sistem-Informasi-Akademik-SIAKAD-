'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    THREE: any;
    VANTA: any;
  }
}

export default function VantaBackground() {
  const pathname = usePathname()
  const vantaRefBack = useRef<HTMLDivElement>(null)
  const vantaRefFront = useRef<HTMLDivElement>(null)

  if (pathname === '/login') {
    return null;
  }

  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true)
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.body.appendChild(script)
      })
    }

    let vantaEffectBack: any = null
    let vantaEffectFront: any = null

    const initVanta = async () => {
      try {
        if (!window.THREE) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
        }
        if (!window.VANTA) {
          await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js')
        }

        if (window.VANTA && window.VANTA.BIRDS) {
          // Layer Belakang (di belakang box) - Lebih banyak burung
          if (vantaRefBack.current) {
            vantaEffectBack = window.VANTA.BIRDS({
              el: vantaRefBack.current,
              mouseControls: false,
              touchControls: false,
              gyroControls: false,
              minHeight: 200.00,
              minWidth: 200.00,
              scale: 1.00,
              scaleMobile: 1.00,
              backgroundColor: 0x000000,
              backgroundAlpha: 0.00,
              color1: 0xff0000,
              color2: 0xd1ff,
              colorMode: 'varianceGradient',
              quantity: 4,
              birdSize: 1.2,
              wingSpan: 30,
              speedLimit: 4,
              separation: 20,
              alignment: 20,
              cohesion: 20
            })
          }

          // Layer Depan (di depan box) - Sedikit burung untuk efek 3D
          if (vantaRefFront.current) {
            vantaEffectFront = window.VANTA.BIRDS({
              el: vantaRefFront.current,
              mouseControls: false,
              touchControls: false,
              gyroControls: false,
              minHeight: 200.00,
              minWidth: 200.00,
              scale: 1.00,
              scaleMobile: 1.00,
              backgroundColor: 0x000000,
              backgroundAlpha: 0.00,
              color1: 0xff0000,
              color2: 0xd1ff,
              colorMode: 'varianceGradient',
              quantity: 2, // Hanya 2 burung yang terbang melewati atas teks
              birdSize: 1.5, // Sedikit lebih besar karena lebih dekat
              wingSpan: 35,
              speedLimit: 5,
              separation: 30,
              alignment: 20,
              cohesion: 20
            })
          }
        }
      } catch (error) {
        console.error('Failed to load Vanta.js', error)
      }
    }

    initVanta()

    return () => {
      if (vantaEffectBack) vantaEffectBack.destroy()
      if (vantaEffectFront) vantaEffectFront.destroy()
    }
  }, [])

  return (
    <>
      <div 
        ref={vantaRefBack} 
        className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60"
        style={{ width: '100vw', height: '100vh' }}
      />
      <div 
        ref={vantaRefFront} 
        className="fixed inset-0 z-[60] pointer-events-none opacity-40 dark:opacity-60"
        style={{ width: '100vw', height: '100vh' }}
      />
    </>
  )
}
