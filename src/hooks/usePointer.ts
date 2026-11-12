import { useEffect, type RefObject } from 'react'
import { CANVAS_WIDTH } from '../game/constants'
import type { Input } from '../game/types'

/**
 * Mouse, touch and pen control through Pointer Events: the paddle follows the pointer's
 * horizontal position over the canvas. Listens on the window so a finger or cursor can be
 * anywhere on the page (handy on a tablet), but ignores presses on buttons.
 */
export function usePointer(input: RefObject<Input>, canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const follow = (e: PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas || (e.target as Element).closest('button')) return
      const rect = canvas.getBoundingClientRect()
      const left = rect.left + canvas.clientLeft // skip the border
      input.current.pointerX = ((e.clientX - left) / canvas.clientWidth) * CANVAS_WIDTH
    }
    window.addEventListener('pointermove', follow)
    window.addEventListener('pointerdown', follow)
    return () => {
      window.removeEventListener('pointermove', follow)
      window.removeEventListener('pointerdown', follow)
    }
  }, [input, canvasRef])
}
