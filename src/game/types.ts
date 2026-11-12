export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'won'

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

export interface Paddle {
  x: number // left edge
  y: number
  width: number
  height: number
}

export interface Brick {
  x: number
  y: number
  width: number
  height: number
  alive: boolean
}

export interface GameState {
  status: GameStatus
  score: number
  lives: number
  ball: Ball
  paddle: Paddle
  bricks: Brick[]
}

export interface Input {
  left: boolean
  right: boolean
}
