import {
  BALL_ACCELERATION, BALL_MAX_SPEED, BALL_RADIUS, BALL_SPEED, BONUS_CHANCE, BONUS_HEIGHT,
  BONUS_SCORE, BONUS_SPEED, BONUS_WIDTH, BRICK_COLS, BRICK_GAP, BRICK_HEIGHT, BRICK_OFFSET_TOP,
  BRICK_ROWS, BRICK_SCORE, CANVAS_HEIGHT, CANVAS_WIDTH, CONFETTI_COUNT, CONFETTI_GRAVITY,
  CONFETTI_LIFE, INITIAL_LIVES, MAX_BALLS, MULTIBALL_ANGLES, PADDLE_HEIGHT, PADDLE_SPEED,
  PADDLE_WIDTH, PIERCE_DURATION,
} from './constants'
import type { Ball, Bonus, Brick, GameState, GameStatus, Input, Paddle, Particle, SoundEvent } from './types'

function createBricks(): Brick[] {
  const width = (CANVAS_WIDTH - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS
  const bricks: Brick[] = []
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_GAP + col * (width + BRICK_GAP),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width,
        height: BRICK_HEIGHT,
        alive: true,
      })
    }
  }
  return bricks
}

function createBallAndPaddle() {
  return {
    balls: [
      {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 60,
        vx: BALL_SPEED * 0.6,
        vy: -BALL_SPEED * 0.8,
        radius: BALL_RADIUS,
      },
    ],
    paddle: {
      x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      y: CANVAS_HEIGHT - 30,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
  }
}

export function createInitialState(): GameState {
  return {
    status: 'idle',
    score: 0,
    lives: INITIAL_LIVES,
    bricks: createBricks(),
    particles: [],
    bonuses: [],
    pierceTimeLeft: 0,
    events: [],
    ...createBallAndPaddle(),
  }
}

function spawnConfetti(x: number, y: number): Particle[] {
  return Array.from({ length: CONFETTI_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 80 + Math.random() * 180
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 120, // slight upward burst
      size: 3 + Math.random() * 3,
      hue: Math.random() * 360,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 20,
      life: CONFETTI_LIFE * (0.6 + Math.random() * 0.4),
    }
  })
}

function stepParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .filter((p) => p.life - dt > 0)
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx * (1 - 1.5 * dt), // air drag
      vy: p.vy + CONFETTI_GRAVITY * dt,
      angle: p.angle + p.spin * dt,
      life: p.life - dt,
    }))
}

interface BallResult {
  ball: Ball
  bricks: Brick[]
  broken: Brick[]
  events: SoundEvent[]
}

/** Moves one ball: walls, paddle, bricks. A piercing ball breaks bricks without bouncing. */
function stepBall(ball: Ball, dt: number, paddle: Paddle, bricks: Brick[], piercing: boolean): BallResult {
  let { x, y, vx, vy } = ball
  const { radius } = ball
  const events: SoundEvent[] = []
  x += vx * dt
  y += vy * dt

  // Wall bounces (left, right, top)
  if (x - radius < 0) { x = radius; vx = -vx; events.push('wall') }
  if (x + radius > CANVAS_WIDTH) { x = CANVAS_WIDTH - radius; vx = -vx; events.push('wall') }
  if (y - radius < 0) { y = radius; vy = -vy; events.push('wall') }

  // Paddle collision: only when the ball is moving down, so it can't get stuck inside.
  if (
    vy > 0 &&
    y + radius >= paddle.y &&
    y - radius <= paddle.y + paddle.height &&
    x + radius >= paddle.x &&
    x - radius <= paddle.x + paddle.width
  ) {
    // Impact point: -1 (left edge) to 1 (right edge) -> bounce angle up to 60° from vertical.
    const hit = Math.max(-1, Math.min(1, (x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)))
    const angle = hit * (Math.PI / 3)
    const speed = Math.hypot(vx, vy)
    vx = speed * Math.sin(angle)
    vy = -speed * Math.cos(angle)
    y = paddle.y - radius
    events.push('paddle')
  }

  // Brick collision. Normal ball: break one brick and bounce on the axis of least overlap.
  // Piercing ball: break every brick it touches and keep going.
  const touching = bricks.filter((b) => {
    if (!b.alive) return false
    const cx = Math.max(b.x, Math.min(x, b.x + b.width))
    const cy = Math.max(b.y, Math.min(y, b.y + b.height))
    return (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2
  })
  const broken = piercing ? touching : touching.slice(0, 1)
  if (broken.length > 0) {
    if (!piercing) {
      const b = broken[0]
      const overlapX = Math.min(x + radius - b.x, b.x + b.width - (x - radius))
      const overlapY = Math.min(y + radius - b.y, b.y + b.height - (y - radius))
      if (overlapX < overlapY) vx = -vx
      else vy = -vy
    }
    // Only this ball speeds up (3 % per broken brick), up to BALL_MAX_SPEED.
    const factor = Math.min(BALL_ACCELERATION ** broken.length, BALL_MAX_SPEED / Math.hypot(vx, vy))
    vx *= factor
    vy *= factor
    bricks = bricks.map((b) => (broken.includes(b) ? { ...b, alive: false } : b))
  }

  return { ball: { ...ball, x, y, vx, vy }, bricks, broken, events }
}

/** Splits the lowest ball into a fan: one extra ball per MULTIBALL_ANGLES entry, up to MAX_BALLS. */
function addMultiballs(balls: Ball[]): Ball[] {
  const source = balls.reduce((low, b) => (b.y > low.y ? b : low))
  const room = Math.max(0, MAX_BALLS - balls.length)
  const heading = Math.atan2(source.vy, source.vx)
  const speed = Math.hypot(source.vx, source.vy)
  const extra = MULTIBALL_ANGLES.slice(0, room).map((deg) => {
    const a = heading + (deg * Math.PI) / 180
    return { ...source, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed }
  })
  return [...balls, ...extra]
}

/**
 * Pure update function: (state, input, dt) -> new state. `dt` is in seconds.
 * Kept free of React and canvas so it is easy to read, test and extend.
 */
export function step(state: GameState, input: Input, dt: number): GameState {
  // Confetti keeps falling after a win / game over, but is frozen on pause and in the menu.
  if (state.status === 'won' || state.status === 'gameover') {
    return state.particles.length
      ? { ...state, particles: stepParticles(state.particles, dt), events: [] }
      : state
  }
  if (state.status !== 'playing') return state

  let particles = stepParticles(state.particles, dt)

  // --- Paddle ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  const paddle: Paddle = {
    ...state.paddle,
    x: Math.max(
      0,
      Math.min(CANVAS_WIDTH - state.paddle.width, state.paddle.x + dir * PADDLE_SPEED * dt),
    ),
  }

  // --- Balls ---
  const piercing = state.pierceTimeLeft > 0
  let pierceTimeLeft = Math.max(0, state.pierceTimeLeft - dt)
  let bricks = state.bricks
  let balls: Ball[] = []
  const broken: Brick[] = []
  const ballEvents = new Set<SoundEvent>() // wall / paddle sounds play once per frame
  for (const ball of state.balls) {
    const result = stepBall(ball, dt, paddle, bricks, piercing)
    bricks = result.bricks
    broken.push(...result.broken)
    result.events.forEach((e) => ballEvents.add(e))
    if (result.ball.y - result.ball.radius <= CANVAS_HEIGHT) balls.push(result.ball)
  }

  // Last ball gone: lose a life, reset the ball, game over at 0 lives.
  const events: SoundEvent[] = [...ballEvents, ...broken.map((): SoundEvent => 'brick')]
  if (balls.length === 0) {
    const lives = state.lives - 1
    events.push(lives <= 0 ? 'gameover' : 'lifeLost')
    return {
      ...state,
      lives,
      status: lives <= 0 ? 'gameover' : 'playing',
      bricks,
      particles,
      bonuses: [],
      pierceTimeLeft: 0,
      events,
      ...createBallAndPaddle(),
    }
  }

  // --- Bonuses: caught by the paddle (+points, effect) or lost below the screen ---
  let score = state.score
  const bonuses: Bonus[] = []
  for (const bonus of state.bonuses) {
    const y = bonus.y + BONUS_SPEED * dt
    const caught =
      y + BONUS_HEIGHT / 2 >= paddle.y &&
      y - BONUS_HEIGHT / 2 <= paddle.y + paddle.height &&
      bonus.x + BONUS_WIDTH / 2 >= paddle.x &&
      bonus.x - BONUS_WIDTH / 2 <= paddle.x + paddle.width
    if (caught) {
      score += BONUS_SCORE
      events.push(bonus.kind)
      if (bonus.kind === 'multiball') balls = addMultiballs(balls)
      else pierceTimeLeft = PIERCE_DURATION
    } else if (y - BONUS_HEIGHT / 2 <= CANVAS_HEIGHT) {
      bonuses.push({ ...bonus, y })
    }
  }

  // --- Broken bricks: score, confetti, maybe a falling bonus ---
  for (const b of broken) {
    const cx = b.x + b.width / 2
    const cy = b.y + b.height / 2
    score += BRICK_SCORE
    particles = [...particles, ...spawnConfetti(cx, cy)]
    if (Math.random() < BONUS_CHANCE) {
      bonuses.push({ x: cx, y: cy, kind: Math.random() < 0.5 ? 'multiball' : 'pierce' })
      events.push('bonusDrop')
    }
  }
  const status: GameStatus = bricks.every((b) => !b.alive) ? 'won' : state.status
  if (status === 'won') events.push('won')

  return { ...state, paddle, balls, bricks, particles, bonuses, pierceTimeLeft, score, status, events }
}
