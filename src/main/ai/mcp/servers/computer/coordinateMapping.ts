import type { CapturedFrame, ComputerPoint } from './types'

export function mapImagePointToDesktop(frame: CapturedFrame, point: ComputerPoint): ComputerPoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('Coordinates must be finite numbers')
  }
  if (point.x < 0 || point.y < 0 || point.x > frame.width || point.y > frame.height) {
    throw new Error(
      `Coordinates (${point.x}, ${point.y}) are outside the last screenshot (${frame.width}x${frame.height})`
    )
  }

  const { bounds } = frame.display
  return {
    x: Math.round(bounds.x + (point.x / frame.width) * bounds.width),
    y: Math.round(bounds.y + (point.y / frame.height) * bounds.height)
  }
}
