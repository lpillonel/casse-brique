interface Props {
  score: number
  lives: number
  fullscreen: boolean
  onToggleFullscreen: () => void
  muted: boolean
  onToggleMute: () => void
}

type ButtonClick = React.MouseEvent<HTMLButtonElement>

export function Hud({ score, lives, fullscreen, onToggleFullscreen, muted, onToggleMute }: Props) {
  // Blur after a click so Space keeps meaning "pause" instead of "click this button again".
  const run = (action: () => void) => (e: ButtonClick) => {
    action()
    e.currentTarget.blur()
  }

  return (
    <div className="hud">
      <span>Score : {score}</span>
      <div className="hud-buttons">
        <button className="hud-btn" title="Son (M)" onClick={run(onToggleMute)}>
          {muted ? 'Son : off' : 'Son : on'}
        </button>
        <button className="hud-btn" title="Plein écran (F)" onClick={run(onToggleFullscreen)}>
          {fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
      </div>
      <span>Vies : {'♥'.repeat(lives)}</span>
    </div>
  )
}
