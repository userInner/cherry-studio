export type ComputerPoint = {
  x: number
  y: number
}

export type ComputerRectangle = ComputerPoint & {
  width: number
  height: number
}

export type ComputerDisplay = {
  id: string
  bounds: ComputerRectangle
  scaleFactor: number
  primary: boolean
}

export type CapturedFrame = {
  display: ComputerDisplay
  width: number
  height: number
  data: string
  mimeType: 'image/jpeg' | 'image/png'
  capturedAt: number
}

export type ComputerPermissionStatus = {
  supported: boolean
  reason?: string
  screenCapture: 'authorized' | 'not-determined' | 'denied'
  accessibility: 'authorized' | 'not-determined' | 'denied' | 'not-required'
}

export type ComputerMouseButton = 'left' | 'middle' | 'right'

export interface ComputerInputDriver {
  listWindows(): Promise<Array<{ title: string; active: boolean }>>
  focusWindow(title: string): Promise<void>
  move(point: ComputerPoint): Promise<void>
  click(button: ComputerMouseButton, count?: 1 | 2): Promise<void>
  drag(from: ComputerPoint, to: ComputerPoint): Promise<void>
  scroll(deltaX: number, deltaY: number): Promise<void>
  typeText(text: string): Promise<void>
  pressKeys(keys: readonly string[]): Promise<void>
}

export interface ComputerDesktopAdapter {
  listDisplays(): ComputerDisplay[]
  capture(
    displayId: string | undefined,
    maxWidth: number,
    format: 'jpeg' | 'png',
    quality: number
  ): Promise<CapturedFrame>
  toDriverPoint(point: ComputerPoint): ComputerPoint
}
