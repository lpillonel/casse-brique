import { BONUS_HEIGHT, BONUS_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, CONFETTI_LIFE } from './constants'
import type { BonusKind, GameState } from './types'

const BONUS_STYLE: Record<BonusKind, { color: string; label: string }> = {
  multiball: { color: '#4ade80', label: '●●●' },
  pierce: { color: '#fb923c', label: '⚡' },
}

// --- Background: synthwave sky with twinkling stars, a sun and a scrolling perspective grid ---

const HORIZON_Y = CANVAS_HEIGHT * 0.62
const GRID_COLOR = '217 70 239' // fuchsia

// Deterministic pseudo-random stars so they don't jump around between reloads.
const STARS = (() => {
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 80 }, () => ({
    x: rand() * CANVAS_WIDTH,
    y: rand() * HORIZON_Y,
    size: 0.6 + rand() * 1.4,
    phase: rand() * Math.PI * 2,
    drift: 15 + rand() * 35, // px / s, parallax fall
  }))
})()

function drawBackground(ctx: CanvasRenderingContext2D, t: number) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  sky.addColorStop(0, '#05010f')
  sky.addColorStop(0.55, '#1e0b3a')
  sky.addColorStop(HORIZON_Y / CANVAS_HEIGHT, '#5b1a6e')
  sky.addColorStop(1, '#0b0620')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Stars
  for (const star of STARS) {
    const y = (star.y + t * star.drift) % HORIZON_Y
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + star.phase)
    ctx.fillStyle = '#e0e7ff'
    ctx.fillRect(star.x, y, star.size, star.size)
  }
  ctx.globalAlpha = 1

  // Sun, cut by the horizon
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, CANVAS_WIDTH, HORIZON_Y)
  ctx.clip()
  const sunR = 80
  const sun = ctx.createLinearGradient(0, HORIZON_Y - sunR * 2, 0, HORIZON_Y)
  sun.addColorStop(0, '#fde047')
  sun.addColorStop(0.5, '#fb7185')
  sun.addColorStop(1, '#c026d3')
  ctx.globalAlpha = 0.55
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(CANVAS_WIDTH / 2, HORIZON_Y - sunR * 0.35, sunR, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Floor
  ctx.fillStyle = '#0b0620'
  ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y)

  // Grid: vertical lines converge to the vanishing point, horizontal lines scroll toward us.
  const floorH = CANVAS_HEIGHT - HORIZON_Y
  ctx.lineWidth = 1
  ctx.strokeStyle = `rgb(${GRID_COLOR} / 0.35)`
  ctx.beginPath()
  for (let i = -12; i <= 12; i++) {
    ctx.moveTo(CANVAS_WIDTH / 2 + i * 8, HORIZON_Y)
    ctx.lineTo(CANVAS_WIDTH / 2 + i * 90, CANVAS_HEIGHT)
  }
  ctx.stroke()
  const lines = 9
  for (let i = 0; i < lines; i++) {
    const k = ((i + (t * 0.9) % 1) / lines) ** 2.2 // 0 at the horizon -> 1 at the bottom
    ctx.strokeStyle = `rgb(${GRID_COLOR} / ${0.1 + 0.35 * k})`
    ctx.beginPath()
    ctx.moveTo(0, HORIZON_Y + k * floorH)
    ctx.lineTo(CANVAS_WIDTH, HORIZON_Y + k * floorH)
    ctx.stroke()
  }

  // Horizon glow
  const glow = ctx.createLinearGradient(0, HORIZON_Y - 12, 0, HORIZON_Y + 12)
  glow.addColorStop(0, 'rgb(217 70 239 / 0)')
  glow.addColorStop(0.5, 'rgb(217 70 239 / 0.6)')
  glow.addColorStop(1, 'rgb(217 70 239 / 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, HORIZON_Y - 12, CANVAS_WIDTH, 24)
}

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  drawBackground(ctx, performance.now() / 1000)

  // Bricks
  state.bricks.forEach((b, i) => {
    if (!b.alive) return
    ctx.fillStyle = `hsl(${(i / 8) * 40 + 200} 80% 60%)`
    ctx.fillRect(b.x, b.y, b.width, b.height)
  })

  // Confetti
  for (const p of state.particles) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, p.life / (CONFETTI_LIFE * 0.4))
    ctx.translate(p.x, p.y)
    ctx.rotate(p.angle)
    ctx.fillStyle = `hsl(${p.hue} 90% 60%)`
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
    ctx.restore()
  }

  // Bonuses
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const b of state.bonuses) {
    const { color, label } = BONUS_STYLE[b.kind]
    ctx.beginPath()
    ctx.roundRect(b.x - BONUS_WIDTH / 2, b.y - BONUS_HEIGHT / 2, BONUS_WIDTH, BONUS_HEIGHT, BONUS_HEIGHT / 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.fillText(label, b.x, b.y + 1)
  }

  // Paddle
  const { paddle, balls } = state
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)

  // Balls (orange while piercing)
  ctx.fillStyle = state.pierceTimeLeft > 0 ? '#fb923c' : '#facc15'
  for (const ball of balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
