interface Props {
  score: number
  lives: number
}

export function Hud({ score, lives }: Props) {
  return (
    <div className="hud">
      <span>Score : {score}</span>
      <span>Vies : {'♥'.repeat(lives)}</span>
    </div>
  )
}
