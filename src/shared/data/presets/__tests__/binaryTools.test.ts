import { describe, expect, it } from 'vitest'

import {
  BABELDOC_MINIMUM_VERSION,
  BABELDOC_TOOL_NAME,
  getBabelDocInstallationStatus,
  isRuntimeDependency,
  PRESETS_BINARY_TOOLS,
  RUNTIME_INTERPRETERS
} from '../binaryTools'

describe('isRuntimeDependency', () => {
  it('recognizes every registered interpreter, bare or with core:/@version', () => {
    for (const runtime of RUNTIME_INTERPRETERS) {
      expect(isRuntimeDependency(runtime)).toBe(true)
      expect(isRuntimeDependency(`core:${runtime}`)).toBe(true)
      expect(isRuntimeDependency(`${runtime}@1.2.3`)).toBe(true)
    }
  })

  it('rejects package-backend and unrelated specs', () => {
    expect(isRuntimeDependency('npm:ntn')).toBe(false)
    expect(isRuntimeDependency('pipx:something')).toBe(false)
    expect(isRuntimeDependency('gh')).toBe(false)
    expect(isRuntimeDependency('ruby')).toBe(false)
  })
})

describe('BabelDOC Stream preset', () => {
  it('uses the independently published executable and package recipe', () => {
    expect(BABELDOC_TOOL_NAME).toBe('babeldoc-stream')
    expect(PRESETS_BINARY_TOOLS.find(({ name }) => name === BABELDOC_TOOL_NAME)).toMatchObject({
      displayName: 'BabelDOC Stream',
      tool: 'pipx:babeldoc-stream',
      repoUrl: 'https://github.com/eeee0717/BabelDOC'
    })
  })

  it.each([
    [undefined, 'missing'],
    [{ status: 'absent' } as const, 'missing'],
    [{ status: 'applied' } as const, 'outdated'],
    [{ status: 'applied', version: '0.6.4.post1' } as const, 'outdated'],
    [{ status: 'applied', version: BABELDOC_MINIMUM_VERSION } as const, 'available'],
    [{ status: 'applied', version: '0.6.5' } as const, 'available']
  ])('classifies application %j as %s', (application, expected) => {
    const snapshot = application
      ? { name: BABELDOC_TOOL_NAME, availability: { source: 'mise' as const, path: '/babeldoc' }, application }
      : undefined
    expect(getBabelDocInstallationStatus(snapshot)).toBe(expected)
  })
})
