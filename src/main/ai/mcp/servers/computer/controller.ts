import { mapImagePointToDesktop } from './coordinateMapping'
import { ElectronDesktopAdapter } from './desktopAdapter'
import { NutComputerInputDriver } from './inputDriver'
import { assertInputPermission, getComputerPermissionStatus, requestComputerPermissions } from './permissions'
import type {
  CapturedFrame,
  ComputerDesktopAdapter,
  ComputerInputDriver,
  ComputerMouseButton,
  ComputerPoint
} from './types'

export class ComputerController {
  private lastFrame?: CapturedFrame

  constructor(
    private readonly desktop: ComputerDesktopAdapter = new ElectronDesktopAdapter(),
    private readonly input: ComputerInputDriver = new NutComputerInputDriver()
  ) {}

  status(requestPermissions = false) {
    return requestPermissions ? requestComputerPermissions() : Promise.resolve(getComputerPermissionStatus())
  }

  listDisplays() {
    return this.desktop.listDisplays()
  }

  async listWindows() {
    assertInputPermission()
    return this.input.listWindows()
  }

  async focusWindow(title: string): Promise<void> {
    assertInputPermission()
    await this.input.focusWindow(title)
  }

  async screenshot(options: {
    displayId?: string
    maxWidth?: number
    format?: 'jpeg' | 'png'
    quality?: number
  }): Promise<CapturedFrame> {
    const frame = await this.desktop.capture(
      options.displayId,
      options.maxWidth ?? 1440,
      options.format ?? 'jpeg',
      options.quality ?? 72
    )
    this.lastFrame = frame
    return frame
  }

  private ground(point: ComputerPoint): ComputerPoint {
    if (!this.lastFrame) throw new Error('Take a screenshot before using coordinate-based actions')
    return this.desktop.toDriverPoint(mapImagePointToDesktop(this.lastFrame, point))
  }

  async move(point: ComputerPoint): Promise<void> {
    assertInputPermission()
    await this.input.move(this.ground(point))
  }

  async click(point: ComputerPoint, button: ComputerMouseButton, count: 1 | 2): Promise<void> {
    assertInputPermission()
    await this.input.move(this.ground(point))
    await this.input.click(button, count)
  }

  async drag(from: ComputerPoint, to: ComputerPoint): Promise<void> {
    assertInputPermission()
    await this.input.drag(this.ground(from), this.ground(to))
  }

  async scroll(point: ComputerPoint | undefined, deltaX: number, deltaY: number): Promise<void> {
    assertInputPermission()
    if (point) await this.input.move(this.ground(point))
    await this.input.scroll(deltaX, deltaY)
  }

  async typeText(text: string): Promise<void> {
    assertInputPermission()
    await this.input.typeText(text)
  }

  async pressKeys(keys: readonly string[]): Promise<void> {
    assertInputPermission()
    await this.input.pressKeys(keys)
  }
}
