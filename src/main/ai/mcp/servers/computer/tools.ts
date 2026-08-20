import { loggerService } from '@logger'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import * as z from 'zod'

import type { ComputerController } from './controller'
import { COMPUTER_TOOL_NAMES } from './toolNames'

const logger = loggerService.withContext('ComputerMcp')

type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: 'image/jpeg' | 'image/png' }

type ToolResult = { content: ToolContent[]; isError: boolean }

const pointProperties = {
  x: { type: 'number', description: 'Horizontal coordinate in pixels in the most recent screenshot' },
  y: { type: 'number', description: 'Vertical coordinate in pixels in the most recent screenshot' }
} as const

const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() })
const EmptySchema = z.object({}).passthrough()
const ScreenshotSchema = z.object({
  displayId: z.string().optional(),
  maxWidth: z.number().int().min(640).max(2560).optional(),
  format: z.enum(['jpeg', 'png']).optional(),
  quality: z.number().int().min(20).max(100).optional()
})
const ClickSchema = PointSchema.extend({
  button: z.enum(['left', 'middle', 'right']).optional(),
  count: z.union([z.literal(1), z.literal(2)]).optional()
})
const DragSchema = z.object({
  from: PointSchema,
  to: PointSchema
})
const ScrollSchema = z.object({
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  deltaX: z.number().int().min(-100).max(100).optional(),
  deltaY: z.number().int().min(-100).max(100).optional()
})
const TextSchema = z.object({ text: z.string().min(1).max(10_000) })
const KeysSchema = z.object({ keys: z.array(z.string().min(1)).min(1).max(8) })
const WindowSchema = z.object({ title: z.string().min(1).max(500) })
const WaitSchema = z.object({ milliseconds: z.number().int().min(0).max(30_000) })

export const computerToolDefinitions: Tool[] = [
  {
    name: COMPUTER_TOOL_NAMES.status,
    description: 'Check platform support and OS permissions for native desktop Computer Use.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: COMPUTER_TOOL_NAMES.requestPermissions,
    description: 'Request the OS permissions required for native desktop capture and input.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: COMPUTER_TOOL_NAMES.listDisplays,
    description: 'List desktop displays, their bounds, scale factors, and primary-display state.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: COMPUTER_TOOL_NAMES.listWindows,
    description: 'List visible native desktop window titles and identify the active window.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: COMPUTER_TOOL_NAMES.focusWindow,
    description: 'Focus a native desktop window by its exact title.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string', description: 'Exact title returned by list_windows' } },
      required: ['title']
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.screenshot,
    description:
      'Capture a desktop display for visual reasoning. Coordinates returned by the image remain valid until the next screenshot.',
    inputSchema: {
      type: 'object',
      properties: {
        displayId: { type: 'string', description: 'Display id from list_displays; defaults to the primary display' },
        maxWidth: { type: 'number', description: 'Maximum encoded image width, 640-2560 (default 1440)' },
        format: { type: 'string', enum: ['jpeg', 'png'] },
        quality: { type: 'number', description: 'JPEG quality, 20-100 (default 72)' }
      }
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.movePointer,
    description: 'Move the native mouse pointer to coordinates from the most recent screenshot.',
    inputSchema: { type: 'object', properties: pointProperties, required: ['x', 'y'] }
  },
  {
    name: COMPUTER_TOOL_NAMES.click,
    description: 'Click at coordinates from the most recent screenshot.',
    inputSchema: {
      type: 'object',
      properties: {
        ...pointProperties,
        button: { type: 'string', enum: ['left', 'middle', 'right'], description: 'Default: left' },
        count: { type: 'number', enum: [1, 2], description: 'Default: 1' }
      },
      required: ['x', 'y']
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.drag,
    description: 'Drag from one point to another using coordinates from the most recent screenshot.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'object', properties: pointProperties, required: ['x', 'y'] },
        to: { type: 'object', properties: pointProperties, required: ['x', 'y'] }
      },
      required: ['from', 'to']
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.scroll,
    description: 'Scroll the native desktop, optionally moving to screenshot coordinates first.',
    inputSchema: {
      type: 'object',
      properties: {
        ...pointProperties,
        deltaX: { type: 'number', description: 'Horizontal scroll steps, -100 to 100' },
        deltaY: { type: 'number', description: 'Vertical scroll steps, -100 to 100' }
      }
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.typeText,
    description: 'Type text into the currently focused native desktop application.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Text to type, up to 10,000 characters' } },
      required: ['text']
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.pressKeys,
    description: 'Press and release one key or a keyboard shortcut in the focused native application.',
    inputSchema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 8,
          description: 'Examples: ["enter"], ["cmd", "a"], ["ctrl", "shift", "p"]'
        }
      },
      required: ['keys']
    }
  },
  {
    name: COMPUTER_TOOL_NAMES.wait,
    description: 'Wait briefly before observing the desktop again.',
    inputSchema: {
      type: 'object',
      properties: { milliseconds: { type: 'number', description: 'Duration from 0 to 30,000 ms' } },
      required: ['milliseconds']
    }
  }
]

function textResult(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError: false }
}

function emptySuccess(): ToolResult {
  return textResult({ ok: true })
}

function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error)
  logger.error('Computer tool failed', { error })
  return { content: [{ type: 'text', text: message }], isError: true }
}

export async function callComputerTool(
  controller: ComputerController,
  name: string,
  args: unknown
): Promise<ToolResult> {
  try {
    switch (name) {
      case COMPUTER_TOOL_NAMES.status:
        EmptySchema.parse(args)
        return textResult(await controller.status(false))
      case COMPUTER_TOOL_NAMES.requestPermissions:
        EmptySchema.parse(args)
        return textResult(await controller.status(true))
      case COMPUTER_TOOL_NAMES.listDisplays:
        EmptySchema.parse(args)
        return textResult(controller.listDisplays())
      case COMPUTER_TOOL_NAMES.listWindows:
        EmptySchema.parse(args)
        return textResult(await controller.listWindows())
      case COMPUTER_TOOL_NAMES.focusWindow: {
        const { title } = WindowSchema.parse(args)
        await controller.focusWindow(title)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.screenshot: {
        const frame = await controller.screenshot(ScreenshotSchema.parse(args))
        const description = {
          display: frame.display,
          image: { width: frame.width, height: frame.height },
          capturedAt: new Date(frame.capturedAt).toISOString(),
          coordinateSpace: 'Use image pixel coordinates for subsequent pointer actions.'
        }
        return {
          content: [
            { type: 'text', text: JSON.stringify(description) },
            { type: 'image', data: frame.data, mimeType: frame.mimeType }
          ],
          isError: false
        }
      }
      case COMPUTER_TOOL_NAMES.movePointer: {
        const point = PointSchema.parse(args)
        await controller.move(point)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.click: {
        const { x, y, button = 'left', count = 1 } = ClickSchema.parse(args)
        await controller.click({ x, y }, button, count)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.drag: {
        const { from, to } = DragSchema.parse(args)
        await controller.drag(from, to)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.scroll: {
        const { x, y, deltaX = 0, deltaY = 0 } = ScrollSchema.parse(args)
        if (!deltaX && !deltaY) throw new Error('scroll requires a non-zero deltaX or deltaY')
        if ((x === undefined) !== (y === undefined)) throw new Error('scroll coordinates require both x and y')
        await controller.scroll(x === undefined ? undefined : { x, y: y! }, deltaX, deltaY)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.typeText: {
        const { text } = TextSchema.parse(args)
        await controller.typeText(text)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.pressKeys: {
        const { keys } = KeysSchema.parse(args)
        await controller.pressKeys(keys)
        return emptySuccess()
      }
      case COMPUTER_TOOL_NAMES.wait: {
        const { milliseconds } = WaitSchema.parse(args)
        await new Promise((resolve) => setTimeout(resolve, milliseconds))
        return emptySuccess()
      }
      default:
        throw new Error(`Unknown Computer Use tool: ${name}`)
    }
  } catch (error) {
    return errorResult(error)
  }
}
