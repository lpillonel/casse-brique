import { useCallback, useEffect, useRef } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { Hud } from './components/Hud'
import { Overlay } from './components/Overlay'
import { render } from './game/render'
import type { GameState } from './game/types'
import { useGame } from './hooks/useGame'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback((state: GameState) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) render(ctx, state)
  }, [])

  const { hud, start, togglePause } = useGame(draw)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause])

  return (
    <main className="app">
      <h1>Casse-brique</h1>
      <Hud score={hud.score} lives={hud.lives} />
      <div className="stage">
        <GameCanvas ref={canvasRef} />
        <Overlay status={hud.status} score={hud.score} onStart={start} onResume={togglePause} />
      </div>
    </main>
  )
}
