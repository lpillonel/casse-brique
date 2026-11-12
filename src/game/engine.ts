import {
  BALL_RADIUS, BALL_SPEED, BRICK_COLS, BRICK_GAP, BRICK_HEIGHT, BRICK_OFFSET_TOP, BRICK_ROWS,
  CANVAS_HEIGHT, CANVAS_WIDTH, INITIAL_LIVES, PADDLE_HEIGHT, PADDLE_SPEED, PADDLE_WIDTH,
} from './constants'
import type { Brick, GameState, Input } from './types'

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
    ball: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
      vx: BALL_SPEED * 0.6,
      vy: -BALL_SPEED * 0.8,
      radius: BALL_RADIUS,
    },
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
    ...createBallAndPaddle(),
  }
}

/**
 * Pure update function: (state, input, dt) -> new state. `dt` is in seconds.
 * Kept free of React and canvas so it is easy to read, test and extend.
 */
export function step(state: GameState, input: Input, dt: number): GameState {
  if (state.status !== 'playing') return state

  // --- Paddle ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  const paddleX = Math.max(
    0,
    Math.min(CANVAS_WIDTH - state.paddle.width, state.paddle.x + dir * PADDLE_SPEED * dt),
  )

  // --- Ball ---
  let { x, y, vx, vy } = state.ball
  const { radius } = state.ball
  x += vx * dt
  y += vy * dt

  // Wall bounces (left, right, top)
  if (x - radius < 0) { x = radius; vx = -vx }
  if (x + radius > CANVAS_WIDTH) { x = CANVAS_WIDTH - radius; vx = -vx }
  if (y - radius < 0) { y = radius; vy = -vy }

  // TODO(atelier 1): paddle collision — bounce the ball when it hits the paddle.
  //   Bonus: change vx depending on where it hits the paddle.

  // TODO(atelier 2): brick collision — mark the brick `alive: false`, bounce, add to score.
  //   When no brick is left, set status to 'won'.

  // TODO(atelier 3): lives — when the ball leaves the bottom, lose a life,
  //   reset the ball, and set status to 'gameover' when lives reach 0.
  //   For now the ball just bounces on the floor so the shell stays playable.
  if (y + radius > CANVAS_HEIGHT) { y = CANVAS_HEIGHT - radius; vy = -vy }

  return {
    ...state,
    paddle: { ...state.paddle, x: paddleX },
    ball: { ...state.ball, x, y, vx, vy },
  }
}
