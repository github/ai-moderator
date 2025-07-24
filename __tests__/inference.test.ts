/**
 * Unit tests for the inference module, src/inference.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock Azure AI Inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPost = jest.fn() as jest.MockedFunction<any>
const mockPath = jest.fn(() => ({ post: mockPost }))
const mockClient = jest.fn(() => ({ path: mockPath }))

jest.unstable_mockModule('@azure-rest/ai-inference', () => ({
  default: mockClient,
  isUnexpected: jest.fn(() => false)
}))

jest.unstable_mockModule('@azure/core-auth', () => ({
  AzureKeyCredential: jest.fn()
}))

// Mock MCP functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExecuteToolCalls = jest.fn() as jest.MockedFunction<any>
jest.unstable_mockModule('../src/mcp.js', () => ({
  executeToolCalls: mockExecuteToolCalls
}))

jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested
const { simpleInference, mcpInference } = await import('../src/inference.js')

describe('inference.ts', () => {
  const mockRequest = {
    messages: [
      { role: 'system', content: 'You are a test assistant' },
      { role: 'user', content: 'Hello, AI!' }
    ],
    modelName: 'gpt-4',
    maxTokens: 100,
    endpoint: 'https://api.test.com',
    token: 'test-token'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('simpleInference', () => {
    it('performs simple inference without tools', async () => {
      const mockResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'Hello, user!'
              }
            }
          ]
        }
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await simpleInference(mockRequest)

      expect(result).toBe('Hello, user!')
      expect(core.info).toHaveBeenCalledWith(
        'Running simple inference without tools'
      )
      expect(core.info).toHaveBeenCalledWith('Model response: Hello, user!')

      // Verify the request structure
      expect(mockPost).toHaveBeenCalledWith({
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a test assistant'
            },
            {
              role: 'user',
              content: 'Hello, AI!'
            }
          ],
          max_tokens: 100,
          model: 'gpt-4'
        }
      })
    })

    it('handles null response content', async () => {
      const mockResponse = {
        body: {
          choices: [
            {
              message: {
                content: null
              }
            }
          ]
        }
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await simpleInference(mockRequest)

      expect(result).toBeNull()
      expect(core.info).toHaveBeenCalledWith(
        'Model response: No response content'
      )
    })
  })

  describe('mcpInference', () => {
    const mockMcpClient = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: {} as any,
      tools: [
        {
          type: 'function' as const,
          function: {
            name: 'test-tool',
            description: 'A test tool',
            parameters: { type: 'object' }
          }
        }
      ]
    }

    it('performs inference without tool calls', async () => {
      const mockResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'Hello, user!',
                tool_calls: null
              }
            }
          ]
        }
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await mcpInference(mockRequest, mockMcpClient)

      expect(result).toBe('Hello, user!')
      expect(core.info).toHaveBeenCalledWith(
        'Running GitHub MCP inference with tools'
      )
      expect(core.info).toHaveBeenCalledWith('MCP inference iteration 1')
      expect(core.info).toHaveBeenCalledWith(
        'No tool calls requested, ending GitHub MCP inference loop'
      )

      // The MCP inference loop will always add the assistant message, even when there are no tool calls
      // So we don't check the exact messages, just that tools were included
      expect(mockPost).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = mockPost.mock.calls[0][0] as any
      expect(callArgs.body.tools).toEqual(mockMcpClient.tools)
      expect(callArgs.body.model).toBe('gpt-4')
      expect(callArgs.body.max_tokens).toBe(100)
    })

    it('executes tool calls and continues conversation', async () => {
      const toolCalls = [
        {
          id: 'call-123',
          function: {
            name: 'test-tool',
            arguments: '{"param": "value"}'
          }
        }
      ]

      const toolResults = [
        {
          tool_call_id: 'call-123',
          role: 'tool',
          name: 'test-tool',
          content: 'Tool result'
        }
      ]

      // First response with tool calls
      const firstResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'I need to use a tool.',
                tool_calls: toolCalls
              }
            }
          ]
        }
      }

      // Second response after tool execution
      const secondResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'Here is the final answer.',
                tool_calls: null
              }
            }
          ]
        }
      }

      mockPost
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

      mockExecuteToolCalls.mockResolvedValue(toolResults)

      const result = await mcpInference(mockRequest, mockMcpClient)

      expect(result).toBe('Here is the final answer.')
      expect(mockExecuteToolCalls).toHaveBeenCalledWith(
        mockMcpClient.client,
        toolCalls
      )
      expect(mockPost).toHaveBeenCalledTimes(2)

      // Verify the second call includes the conversation history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const secondCall = mockPost.mock.calls[1][0] as any
      expect(secondCall.body.messages).toHaveLength(5) // system, user, assistant, tool, assistant
      expect(secondCall.body.messages[2].role).toBe('assistant')
      expect(secondCall.body.messages[2].tool_calls).toEqual(toolCalls)
      expect(secondCall.body.messages[3]).toEqual(toolResults[0])
    })

    it('handles maximum iteration limit', async () => {
      const toolCalls = [
        {
          id: 'call-123',
          function: {
            name: 'test-tool',
            arguments: '{}'
          }
        }
      ]

      const toolResults = [
        {
          tool_call_id: 'call-123',
          role: 'tool',
          name: 'test-tool',
          content: 'Tool result'
        }
      ]

      // Always respond with tool calls to trigger infinite loop
      const responseWithToolCalls = {
        body: {
          choices: [
            {
              message: {
                content: 'Using tool again.',
                tool_calls: toolCalls
              }
            }
          ]
        }
      }

      mockPost.mockResolvedValue(responseWithToolCalls)
      mockExecuteToolCalls.mockResolvedValue(toolResults)

      const result = await mcpInference(mockRequest, mockMcpClient)

      expect(mockPost).toHaveBeenCalledTimes(5) // Max iterations reached
      expect(core.warning).toHaveBeenCalledWith(
        'GitHub MCP inference loop exceeded maximum iterations (5)'
      )
      expect(result).toBe('Using tool again.') // Last assistant message
    })

    it('handles empty tool calls array', async () => {
      const mockResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'Hello, user!',
                tool_calls: []
              }
            }
          ]
        }
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await mcpInference(mockRequest, mockMcpClient)

      expect(result).toBe('Hello, user!')
      expect(core.info).toHaveBeenCalledWith(
        'No tool calls requested, ending GitHub MCP inference loop'
      )
      expect(mockExecuteToolCalls).not.toHaveBeenCalled()
    })

    it('returns last assistant message when no content in final iteration', async () => {
      const toolCalls = [
        {
          id: 'call-123',
          function: { name: 'test-tool', arguments: '{}' }
        }
      ]

      const firstResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'First message',
                tool_calls: toolCalls
              }
            }
          ]
        }
      }

      const secondResponse = {
        body: {
          choices: [
            {
              message: {
                content: 'Second message',
                tool_calls: toolCalls
              }
            }
          ]
        }
      }

      mockPost
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValue(secondResponse)

      mockExecuteToolCalls.mockResolvedValue([
        {
          tool_call_id: 'call-123',
          role: 'tool',
          name: 'test-tool',
          content: 'result'
        }
      ])

      const result = await mcpInference(mockRequest, mockMcpClient)

      expect(result).toBe('Second message')
    })
  })
})
