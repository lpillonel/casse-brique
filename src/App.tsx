import { useCallback, useEffect, useRef, useState } from 'react'
import { audio } from './audio/audio'
import { GameCanvas } from './components/GameCanvas'
import { Hud } from './components/Hud'
import { Overlay } from './components/Overlay'
import { render } from './game/render'
import type { GameState } from './game/types'
import { useGame } from './hooks/useGame'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<HTMLElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [muted, setMuted] = useState(() => audio.isMuted())
  const toggleMute = useCallback(() => setMuted(audio.toggleMute()), [])

  // Fullscreen is applied to the whole app (title, HUD, canvas, overlay), not just the canvas.
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return // e.g. iPhone Safari
    if (document.fullscreenElement) void document.exitFullscreen()
    else void appRef.current?.requestFullscreen()
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === appRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const draw = useCallback((state: GameState) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) render(ctx, state)
  }, [])

  const { hud, start, togglePause } = useGame(draw, canvasRef)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePause()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause, toggleFullscreen, toggleMute])

  return (
    <main className="app" ref={appRef}>
      <h1>Casse-brique</h1>
      <Hud
        score={hud.score}
        lives={hud.lives}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        canFullscreen={document.fullscreenEnabled}
        status={hud.status}
        onTogglePause={togglePause}
        muted={muted}
        onToggleMute={toggleMute}
      />
      <div className="stage">
        <GameCanvas ref={canvasRef} />
        <Overlay status={hud.status} score={hud.score} onStart={start} onResume={togglePause} />
      </div>
    </main>
  )
}
