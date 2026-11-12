import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants'
import type { GameState } from './types'

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Bricks
  state.bricks.forEach((b, i) => {
    if (!b.alive) return
    ctx.fillStyle = `hsl(${(i / 8) * 40 + 200} 80% 60%)`
    ctx.fillRect(b.x, b.y, b.width, b.height)
  })

  // Paddle
  const { paddle, ball } = state
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)

  // Ball
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = '#facc15'
  ctx.fill()
}
