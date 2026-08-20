# Native Desktop Computer Use

`@cherry/computer` is an opt-in, in-memory MCP server for controlling the real desktop. It is separate from
`@cherry/browser`, which only controls Cherry's dedicated Electron browser window.

## Architecture

- `ElectronDesktopAdapter` uses Electron `screen` and `desktopCapturer` for display metadata and screenshots.
- `NutComputerInputDriver` is the only layer that imports the optional native input dependency.
- `ComputerController` owns the last screenshot and maps image pixels to logical desktop coordinates, then to the
  native driver's coordinate space.
- Tools return recoverable MCP errors instead of throwing across the tool boundary.

The input driver is behind `ComputerInputDriver` so the native dependency can be replaced without changing the MCP
contract.

## Safety boundary

- The server is disabled by default.
- Screenshots, window titles, permission prompts, and every desktop action are configured for per-call approval.
- Claude Code mirrors those actions into a `PreToolUse` approval hook, so `acceptEdits` and `bypassPermissions` cannot
  skip the prompt. Headless turns fail closed because no responder is available.
- Pi marks the same actions as approval-required and non-bypassable.
- Coordinate actions require a prior screenshot and reject out-of-bounds points instead of clamping them.
- Text and key-array sizes are bounded; waits are capped at 30 seconds.

Do not add a generic script or shell action to this server. Desktop actions must remain finite, typed, and reviewable.

## Platform support

- macOS: Screen Recording and Accessibility permissions are required.
- Windows: supported through the native input driver.
- Linux X11: supported when the runtime system libraries are present.
- Linux Wayland: explicitly rejected because the current native driver cannot provide reliable global input there.
