import { isMac } from '@main/core/platform'
import { getScreenCapturePermissionStatus, requestScreenCapturePermission } from '@main/utils/screenCapturePermission'
import { systemPreferences } from 'electron'

import type { ComputerPermissionStatus } from './types'

export function getComputerPlatformSupport(): Pick<ComputerPermissionStatus, 'supported' | 'reason'> {
  if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE?.toLowerCase() === 'wayland') {
    return {
      supported: false,
      reason: 'Native desktop input is not available on Wayland. Sign in with an X11/Xorg session to use Computer Use.'
    }
  }
  return { supported: true }
}

export function getComputerPermissionStatus(): ComputerPermissionStatus {
  const support = getComputerPlatformSupport()
  return {
    ...support,
    screenCapture: getScreenCapturePermissionStatus(),
    accessibility: isMac
      ? systemPreferences.isTrustedAccessibilityClient(false)
        ? 'authorized'
        : 'not-determined'
      : 'not-required'
  }
}

export async function requestComputerPermissions(): Promise<ComputerPermissionStatus> {
  if (isMac) {
    systemPreferences.isTrustedAccessibilityClient(true)
    await requestScreenCapturePermission()
  }
  return getComputerPermissionStatus()
}

export function assertScreenCapturePermission(): void {
  const status = getComputerPermissionStatus()
  if (!status.supported) throw new Error(status.reason)
  if (status.screenCapture !== 'authorized') {
    throw new Error('Screen Recording permission is required. Grant it in system settings, then restart Cherry Studio.')
  }
}

export function assertInputPermission(): void {
  const status = getComputerPermissionStatus()
  if (!status.supported) throw new Error(status.reason)
  if (status.accessibility !== 'authorized' && status.accessibility !== 'not-required') {
    throw new Error('Accessibility permission is required before Cherry Studio can control the mouse or keyboard.')
  }
}
