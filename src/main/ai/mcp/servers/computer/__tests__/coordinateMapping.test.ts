import { describe, expect, it } from 'vitest'

import { mapImagePointToDesktop } from '../coordinateMapping'
import type { CapturedFrame } from '../types'

const frame: CapturedFrame = {
  display: {
    id: '2',
    bounds: { x: -1920, y: 100, width: 1920, height: 1080 },
    scaleFactor: 2,
    primary: false
  },
  width: 1440,
  height: 810,
  data: '',
  mimeType: 'image/jpeg',
  capturedAt: 0
}

describe('mapImagePointToDesktop', () => {
  it('maps screenshot pixels into the captured display logical coordinate space', () => {
    expect(mapImagePointToDesktop(frame, { x: 720, y: 405 })).toEqual({ x: -960, y: 640 })
  })

  it('rejects coordinates outside the screenshot instead of silently clamping them', () => {
    expect(() => mapImagePointToDesktop(frame, { x: 1441, y: 10 })).toThrow('outside the last screenshot')
    expect(() => mapImagePointToDesktop(frame, { x: Number.NaN, y: 10 })).toThrow('finite numbers')
  })
})
