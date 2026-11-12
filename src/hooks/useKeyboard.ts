import { useEffect, useRef } from 'react'
import type { Input } from '../game/types'

/** Tracks arrow keys / A-D in a ref (no re-render on every key event). */
export function useKeyboard() {
  const input = useRef<Input>({ left: false, right: false })

  useEffect(() => {
    const set = (e: KeyboardEvent, pressed: boolean) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = pressed
      if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = pressed
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return input
}
