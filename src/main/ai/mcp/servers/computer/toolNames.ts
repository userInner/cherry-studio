export const COMPUTER_TOOL_NAMES = {
  status: 'status',
  requestPermissions: 'request_permissions',
  listDisplays: 'list_displays',
  listWindows: 'list_windows',
  focusWindow: 'focus_window',
  screenshot: 'screenshot',
  movePointer: 'move_pointer',
  click: 'click',
  drag: 'drag',
  scroll: 'scroll',
  typeText: 'type_text',
  pressKeys: 'press_keys',
  wait: 'wait'
} as const

/** Desktop content disclosure and every action that can affect another application require approval. */
export const COMPUTER_APPROVAL_REQUIRED_TOOL_NAMES = [
  COMPUTER_TOOL_NAMES.requestPermissions,
  COMPUTER_TOOL_NAMES.listWindows,
  COMPUTER_TOOL_NAMES.focusWindow,
  COMPUTER_TOOL_NAMES.screenshot,
  COMPUTER_TOOL_NAMES.movePointer,
  COMPUTER_TOOL_NAMES.click,
  COMPUTER_TOOL_NAMES.drag,
  COMPUTER_TOOL_NAMES.scroll,
  COMPUTER_TOOL_NAMES.typeText,
  COMPUTER_TOOL_NAMES.pressKeys
] as const

export type ComputerApprovalRequiredToolName = (typeof COMPUTER_APPROVAL_REQUIRED_TOOL_NAMES)[number]
