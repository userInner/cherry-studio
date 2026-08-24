import { PromptBuilder } from '@main/ai/agents/prompt'
import type { AgentEntity } from '@shared/data/api/schemas/agents'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@main/ai/agents/builtin/BuiltinAgentProvisioner', () => ({
  loadBuiltinAgentDefinition: vi.fn(),
  provisionBuiltinAgent: vi.fn()
}))

vi.mock('@main/i18n', () => ({ getAppLanguage: vi.fn(() => 'zh-CN') }))
vi.mock('@main/utils/prompt', () => ({ replacePromptVariables: vi.fn(async (value: string) => value) }))

const { buildAgentRuntimePrompt } = await import('../agentPrompt')

function agent(instructions?: string): AgentEntity {
  return { instructions, configuration: {} } as AgentEntity
}

describe('buildAgentRuntimePrompt language precedence', () => {
  beforeEach(() => {
    vi.spyOn(PromptBuilder.prototype, 'buildPromptParts').mockResolvedValue({
      base: { kind: 'native' },
      context: ''
    })
  })

  it('keeps an explicit Agent System Prompt language authoritative over the UI language', async () => {
    const result = await buildAgentRuntimePrompt({
      workspacePath: '/workspace',
      agentDataPath: '/agent',
      agent: agent('All final outputs must be written in English.')
    })

    expect(result.append).toContain('By default, respond in Chinese (Simplified).')
    expect(result.append).toContain('Follow any explicit output-language requirement in the Agent System Prompt.')
    expect(result.append).not.toContain('IMPORTANT: You must respond in Chinese (Simplified).')
  })

  it('keeps the UI language requirement when no Agent System Prompt is configured', async () => {
    const result = await buildAgentRuntimePrompt({
      workspacePath: '/workspace',
      agentDataPath: '/agent',
      agent: agent()
    })

    expect(result.append).toContain('IMPORTANT: You must respond in Chinese (Simplified).')
  })
})
