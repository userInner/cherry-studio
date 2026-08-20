import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ComputerController } from '../controller'
import type { CapturedFrame, ComputerDesktopAdapter, ComputerInputDriver, ComputerPoint } from '../types'

vi.mock('../permissions', () => ({
  assertInputPermission: vi.fn(),
  getComputerPermissionStatus: vi.fn(() => ({
    supported: true,
    screenCapture: 'authorized',
    accessibility: 'authorized'
  })),
  requestComputerPermissions: vi.fn(() =>
    Promise.resolve({ supported: true, screenCapture: 'authorized', accessibility: 'authorized' })
  )
}))

const frame: CapturedFrame = {
  display: {
    id: '1',
    bounds: { x: 100, y: 200, width: 1000, height: 500 },
    scaleFactor: 1,
    primary: true
  },
  width: 1000,
  height: 500,
  data: 'image',
  mimeType: 'image/jpeg',
  capturedAt: 0
}

class FakeDesktop implements ComputerDesktopAdapter {
  listDisplays = vi.fn(() => [frame.display])
  capture = vi.fn(() => Promise.resolve(frame))
  toDriverPoint = vi.fn((point: ComputerPoint) => ({ x: point.x * 2, y: point.y * 2 }))
}

class FakeInput implements ComputerInputDriver {
  listWindows = vi.fn(() => Promise.resolve([]))
  focusWindow = vi.fn(() => Promise.resolve())
  move = vi.fn(() => Promise.resolve())
  click = vi.fn<ComputerInputDriver['click']>(() => Promise.resolve())
  drag = vi.fn(() => Promise.resolve())
  scroll = vi.fn(() => Promise.resolve())
  typeText = vi.fn(() => Promise.resolve())
  pressKeys = vi.fn(() => Promise.resolve())
}

describe('ComputerController', () => {
  let desktop: FakeDesktop
  let input: FakeInput
  let controller: ComputerController

  beforeEach(() => {
    desktop = new FakeDesktop()
    input = new FakeInput()
    controller = new ComputerController(desktop, input)
  })

  it('requires a fresh screenshot before coordinate-based input', async () => {
    await expect(controller.move({ x: 10, y: 10 })).rejects.toThrow('Take a screenshot')
    expect(input.move).not.toHaveBeenCalled()
  })

  it('grounds screenshot coordinates and converts them for the native input driver', async () => {
    await controller.screenshot({})
    await controller.click({ x: 500, y: 250 }, 'left', 1)

    expect(desktop.toDriverPoint).toHaveBeenCalledWith({ x: 600, y: 450 })
    expect(input.move).toHaveBeenCalledWith({ x: 1200, y: 900 })
    expect(input.click).toHaveBeenCalledWith('left', 1)
  })
})
