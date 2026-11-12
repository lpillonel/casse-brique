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

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  angle: number
  spin: number
  life: number // seconds left
}

export type BonusKind = 'multiball' | 'pierce'

export interface Bonus {
  x: number // center
  y: number // center
  kind: BonusKind
}

/** Things that just happened during a step; the audio layer turns them into sounds. */
export type SoundEvent =
  | 'wall' | 'paddle' | 'brick' | 'bonusDrop' | 'multiball' | 'pierce'
  | 'lifeLost' | 'gameover' | 'won' | 'start'

export interface GameState {
  status: GameStatus
  score: number
  lives: number
  balls: Ball[]
  paddle: Paddle
  bricks: Brick[]
  particles: Particle[]
  bonuses: Bonus[]
  pierceTimeLeft: number // seconds during which balls go through bricks
  events: SoundEvent[] // produced by the last step only
}

export interface Input {
  left: boolean
  right: boolean
  /** Where the pointer (mouse / finger / pen) wants the paddle center, in canvas pixels. */
  pointerX: number | null
}
