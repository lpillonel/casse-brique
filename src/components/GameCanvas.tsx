import { forwardRef } from 'react'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants'

export const GameCanvas = forwardRef<HTMLCanvasElement>(function GameCanvas(_, ref) {
  return <canvas ref={ref} className="canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
})
