import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { ComputerController } from './controller'
import { callComputerTool, computerToolDefinitions } from './tools'

export class ComputerServer {
  private readonly mcpServer: McpServer
  private readonly controller = new ComputerController()

  get server(): Server {
    return this.mcpServer.server
  }

  constructor() {
    this.mcpServer = new McpServer(
      { name: '@cherry/computer', version: '0.1.0' },
      { capabilities: { resources: {}, tools: {} } }
    )
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: computerToolDefinitions }))
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return callComputerTool(this.controller, request.params.name, request.params.arguments)
    })
  }
}

export default ComputerServer
