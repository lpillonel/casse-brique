import type { GameStatus } from '../game/types'

interface Props {
  score: number
  lives: number
  status: GameStatus
  onTogglePause: () => void
  canFullscreen: boolean
  fullscreen: boolean
  onToggleFullscreen: () => void
  muted: boolean
  onToggleMute: () => void
}

type ButtonClick = React.MouseEvent<HTMLButtonElement>

export function Hud({
  score, lives, status, onTogglePause, canFullscreen, fullscreen, onToggleFullscreen, muted, onToggleMute,
}: Props) {
  // Blur after a click so Space keeps meaning "pause" instead of "click this button again".
  const run = (action: () => void) => (e: ButtonClick) => {
    action()
    e.currentTarget.blur()
  }
  const canPause = status === 'playing' || status === 'paused'

  return (
    <div className="hud">
      <span>Score : {score}</span>
      <div className="hud-buttons">
        {canPause && (
          <button className="hud-btn" title="Pause (Espace)" onClick={run(onTogglePause)}>
            {status === 'paused' ? 'Reprendre' : 'Pause'}
          </button>
        )}
        <button className="hud-btn" title="Son (M)" onClick={run(onToggleMute)}>
          {muted ? 'Son : off' : 'Son : on'}
        </button>
        {canFullscreen && (
          <button className="hud-btn" title="Plein écran (F)" onClick={run(onToggleFullscreen)}>
            {fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
        )}
      </div>
      <span>Vies : {'♥'.repeat(lives)}</span>
    </div>
  )
}
