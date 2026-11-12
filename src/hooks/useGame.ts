import { useCallback, useEffect, useRef, useState } from 'react'
import { createInitialState, step } from '../game/engine'
import type { GameState } from '../game/types'
import { useKeyboard } from './useKeyboard'

/**
 * Owns the game state and the requestAnimationFrame loop.
 * The state lives in a ref (updated 60x/s); a React state copy is pushed
 * only for the HUD/overlay, so React doesn't re-render the canvas every frame.
 */
export function useGame(onFrame: (state: GameState) => void) {
  const input = useKeyboard()
  const [hud, setHud] = useState(createInitialState)
  const stateRef = useRef<GameState>(hud)
  const onFrameRef = useRef(onFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05) // clamp after tab switch
      last = now

      const prev = stateRef.current
      const next = step(prev, input.current, dt)
      stateRef.current = next
      onFrameRef.current(next)

      if (next.status !== prev.status || next.score !== prev.score || next.lives !== prev.lives) {
        setHud(next)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [input])

  const setStatus = useCallback((status: GameState['status']) => {
    stateRef.current = { ...stateRef.current, status }
    setHud(stateRef.current)
  }, [])

  const start = useCallback(() => {
    stateRef.current = { ...createInitialState(), status: 'playing' }
    setHud(stateRef.current)
  }, [])

  const togglePause = useCallback(() => {
    const { status } = stateRef.current
    if (status === 'playing') setStatus('paused')
    else if (status === 'paused') setStatus('playing')
  }, [setStatus])

  return { hud, start, togglePause }
}
