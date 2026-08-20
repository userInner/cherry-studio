import { desktopCapturer, screen } from 'electron'

import { assertScreenCapturePermission } from './permissions'
import type { CapturedFrame, ComputerDesktopAdapter, ComputerDisplay, ComputerPoint } from './types'

const DEFAULT_MAX_WIDTH = 1440

function toComputerDisplay(display: Electron.Display, primaryId: number): ComputerDisplay {
  return {
    id: String(display.id),
    bounds: { ...display.bounds },
    scaleFactor: display.scaleFactor,
    primary: display.id === primaryId
  }
}

export class ElectronDesktopAdapter implements ComputerDesktopAdapter {
  listDisplays(): ComputerDisplay[] {
    const primaryId = screen.getPrimaryDisplay().id
    return screen.getAllDisplays().map((display) => toComputerDisplay(display, primaryId))
  }

  async capture(
    displayId: string | undefined,
    maxWidth = DEFAULT_MAX_WIDTH,
    format: 'jpeg' | 'png' = 'jpeg',
    quality = 72
  ): Promise<CapturedFrame> {
    assertScreenCapturePermission()
    const displays = this.listDisplays()
    const selected = displayId
      ? displays.find((display) => display.id === displayId)
      : displays.find((display) => display.primary)
    if (!selected) throw new Error(`Display ${displayId ?? 'primary'} was not found`)

    const physicalWidth = Math.max(1, Math.round(selected.bounds.width * selected.scaleFactor))
    const physicalHeight = Math.max(1, Math.round(selected.bounds.height * selected.scaleFactor))
    const width = Math.max(1, Math.min(maxWidth, physicalWidth))
    const height = Math.max(1, Math.round((physicalHeight / physicalWidth) * width))
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } })
    const selectedIndex = displays.findIndex((display) => display.id === selected.id)
    const source =
      sources.find((candidate) => candidate.display_id === selected.id) ??
      sources[selectedIndex] ??
      (selected.primary ? sources[0] : undefined)
    if (!source || source.thumbnail.isEmpty()) {
      throw new Error(
        'Desktop capture returned no image. On macOS, restart Cherry Studio after granting Screen Recording permission.'
      )
    }

    const image = source.thumbnail
    const size = image.getSize()
    return {
      display: selected,
      width: size.width,
      height: size.height,
      data: (format === 'png' ? image.toPNG() : image.toJPEG(quality)).toString('base64'),
      mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      capturedAt: Date.now()
    }
  }

  toDriverPoint(point: ComputerPoint): ComputerPoint {
    if (process.platform === 'darwin') return point
    return screen.dipToScreenPoint(point)
  }
}
