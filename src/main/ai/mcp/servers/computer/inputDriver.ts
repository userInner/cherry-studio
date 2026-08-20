import type * as NutJs from '@nut-tree-fork/nut-js'

import type { ComputerInputDriver, ComputerMouseButton, ComputerPoint } from './types'

type NutModule = typeof NutJs

const KEY_ALIASES: Record<string, keyof NutModule['Key']> = {
  alt: 'LeftAlt',
  backspace: 'Backspace',
  cmd: 'LeftCmd',
  command: 'LeftCmd',
  control: 'LeftControl',
  ctrl: 'LeftControl',
  delete: 'Delete',
  down: 'Down',
  end: 'End',
  enter: 'Return',
  esc: 'Escape',
  escape: 'Escape',
  home: 'Home',
  left: 'Left',
  meta: process.platform === 'darwin' ? 'LeftCmd' : 'LeftSuper',
  pagedown: 'PageDown',
  pageup: 'PageUp',
  return: 'Return',
  right: 'Right',
  shift: 'LeftShift',
  space: 'Space',
  super: 'LeftSuper',
  tab: 'Tab',
  up: 'Up',
  win: 'LeftWin'
}

function buttonFor(module: NutModule, button: ComputerMouseButton): NutModule['Button'][keyof NutModule['Button']] {
  if (button === 'middle') return module.Button.MIDDLE
  if (button === 'right') return module.Button.RIGHT
  return module.Button.LEFT
}

function keyFor(module: NutModule, input: string): NutModule['Key'][keyof NutModule['Key']] {
  const normalized = input.trim().toLowerCase()
  const alias = KEY_ALIASES[normalized]
  if (alias) return module.Key[alias]
  if (/^[a-z]$/.test(normalized)) return module.Key[normalized.toUpperCase() as keyof NutModule['Key']]
  if (/^[0-9]$/.test(normalized)) return module.Key[`Num${normalized}` as keyof NutModule['Key']]
  if (/^f([1-9]|1[0-9]|2[0-4])$/.test(normalized)) {
    return module.Key[normalized.toUpperCase() as keyof NutModule['Key']]
  }
  throw new Error(`Unsupported key: ${input}`)
}

export class NutComputerInputDriver implements ComputerInputDriver {
  private modulePromise?: Promise<NutModule>

  private async load(): Promise<NutModule> {
    this.modulePromise ??= import('@nut-tree-fork/nut-js').catch((error) => {
      this.modulePromise = undefined
      throw new Error(`Native input driver unavailable: ${error instanceof Error ? error.message : String(error)}`)
    })
    return this.modulePromise
  }

  async listWindows(): Promise<Array<{ title: string; active: boolean }>> {
    const module = await this.load()
    const [windows, activeWindow] = await Promise.all([module.getWindows(), module.getActiveWindow()])
    const [activeTitle, titles] = await Promise.all([
      activeWindow.getTitle(),
      Promise.all(windows.map((window) => window.getTitle()))
    ])
    return titles.filter(Boolean).map((title) => ({ title, active: title === activeTitle }))
  }

  async focusWindow(title: string): Promise<void> {
    const module = await this.load()
    const windows = await module.getWindows()
    const matches = await Promise.all(windows.map(async (window) => ({ window, title: await window.getTitle() })))
    const exact = matches.find((candidate) => candidate.title === title)
    const insensitive = matches.find((candidate) => candidate.title.toLowerCase() === title.toLowerCase())
    const candidate = exact ?? insensitive
    if (!candidate) throw new Error(`Window not found: ${title}`)
    if (!(await candidate.window.focus())) throw new Error(`Unable to focus window: ${candidate.title}`)
  }

  async move(point: ComputerPoint): Promise<void> {
    const module = await this.load()
    await module.mouse.setPosition(new module.Point(point.x, point.y))
  }

  async click(button: ComputerMouseButton, count: 1 | 2 = 1): Promise<void> {
    const module = await this.load()
    if (count === 2) await module.mouse.doubleClick(buttonFor(module, button))
    else await module.mouse.click(buttonFor(module, button))
  }

  async drag(from: ComputerPoint, to: ComputerPoint): Promise<void> {
    const module = await this.load()
    const start = new module.Point(from.x, from.y)
    const end = new module.Point(to.x, to.y)
    await module.mouse.setPosition(start)
    await module.mouse.drag([start, end])
  }

  async scroll(deltaX: number, deltaY: number): Promise<void> {
    const module = await this.load()
    if (deltaY > 0) await module.mouse.scrollDown(Math.abs(deltaY))
    if (deltaY < 0) await module.mouse.scrollUp(Math.abs(deltaY))
    if (deltaX > 0) await module.mouse.scrollRight(Math.abs(deltaX))
    if (deltaX < 0) await module.mouse.scrollLeft(Math.abs(deltaX))
  }

  async typeText(text: string): Promise<void> {
    const module = await this.load()
    await module.keyboard.type(text)
  }

  async pressKeys(keys: readonly string[]): Promise<void> {
    const module = await this.load()
    const resolved = keys.map((key) => keyFor(module, key))
    await module.keyboard.pressKey(...resolved)
    await module.keyboard.releaseKey(...resolved.slice().reverse())
  }
}
