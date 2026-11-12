import type { GameStatus } from '../game/types'

interface Props {
  status: GameStatus
  score: number
  onStart: () => void
  onResume: () => void
}

/** Menu shown on top of the canvas when the game is not running. */
export function Overlay({ status, score, onStart, onResume }: Props) {
  if (status === 'playing') return null

  return (
    <div className="overlay">
      {status === 'idle' && <h2>Casse-brique</h2>}
      {status === 'paused' && <h2>Pause</h2>}
      {status === 'gameover' && <h2>Perdu — score {score}</h2>}
      {status === 'won' && <h2>Gagné ! — score {score}</h2>}

      {status === 'paused' ? (
        <button onClick={onResume}>Reprendre</button>
      ) : (
        <button onClick={onStart}>{status === 'idle' ? 'Jouer' : 'Rejouer'}</button>
      )}
      <p className="hint">← → / A D, souris ou doigt pour bouger · Espace pour pause</p>
    </div>
  )
}
