import * as core from '@actions/core'
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference'
import { AzureKeyCredential } from '@azure/core-auth'
import { GitHubMCPClient, executeToolCalls, MCPTool, ToolCall } from './mcp.js'
import { handleUnexpectedResponse } from './helpers.js'

interface ChatMessage {
  role: string
  content: string | null
  tool_calls?: ToolCall[]
}

interface ChatCompletionsRequestBody {
  messages: ChatMessage[]
  max_tokens: number
  model: string
  response_format?: { type: 'json_schema'; json_schema: unknown }
  tools?: MCPTool[]
}

export interface InferenceRequest {
  messages: Array<{ role: string; content: string }>
  modelName: string
  maxTokens: number
  endpoint: string
  token: string
  responseFormat?: { type: 'json_schema'; json_schema: unknown } // Processed response format for the API
}

export interface InferenceResponse {
  content: string | null
  toolCalls?: Array<{
    id: string
    type: string
    function: {
      name: string
      arguments: string
    }
  }>
}

/**
 * Simple one-shot inference without tools
 */
export async function simpleInference(
  request: InferenceRequest
): Promise<string | null> {
  core.info('Running simple inference without tools')

  const client = ModelClient(
    request.endpoint,
    new AzureKeyCredential(request.token),
    {
      userAgentOptions: { userAgentPrefix: 'github-actions-ai-inference' }
    }
  )

  const requestBody: ChatCompletionsRequestBody = {
    messages: request.messages,
    max_tokens: request.maxTokens,
    model: request.modelName
  }

  // Add response format if specified
  if (request.responseFormat) {
    requestBody.response_format = request.responseFormat
  }

  const response = await client.path('/chat/completions').post({
    body: requestBody
  })

  if (isUnexpected(response)) {
    handleUnexpectedResponse(response)
  }

  const modelResponse = response.body.choices[0].message.content
  core.info(`Model response: ${modelResponse || 'No response content'}`)

  return modelResponse
}

/**
 * GitHub MCP-enabled inference with tool execution loop
 */
export async function mcpInference(
  request: InferenceRequest,
  githubMcpClient: GitHubMCPClient
): Promise<string | null> {
  core.info('Running GitHub MCP inference with tools')

  const client = ModelClient(
    request.endpoint,
    new AzureKeyCredential(request.token),
    {
      userAgentOptions: { userAgentPrefix: 'github-actions-ai-inference' }
    }
  )

  // Start with the pre-processed messages
  const messages: ChatMessage[] = [...request.messages]

  let iterationCount = 0
  const maxIterations = 5 // Prevent infinite loops

  while (iterationCount < maxIterations) {
    iterationCount++
    core.info(`MCP inference iteration ${iterationCount}`)

    const requestBody: ChatCompletionsRequestBody = {
      messages: messages,
      max_tokens: request.maxTokens,
      model: request.modelName,
      tools: githubMcpClient.tools
    }

    // Add response format if specified (only on first iteration to avoid conflicts)
    if (iterationCount === 1 && request.responseFormat) {
      requestBody.response_format = request.responseFormat
    }

    const response = await client.path('/chat/completions').post({
      body: requestBody
    })

    if (isUnexpected(response)) {
      handleUnexpectedResponse(response)
    }

    const assistantMessage = response.body.choices[0].message
    const modelResponse = assistantMessage.content
    const toolCalls = assistantMessage.tool_calls

    core.info(`Model response: ${modelResponse || 'No response content'}`)

    messages.push({
      role: 'assistant',
      content: modelResponse || '',
      ...(toolCalls && { tool_calls: toolCalls })
    })

    if (!toolCalls || toolCalls.length === 0) {
      core.info('No tool calls requested, ending GitHub MCP inference loop')
      return modelResponse
    }

    core.info(`Model requested ${toolCalls.length} tool calls`)

    // Execute all tool calls via GitHub MCP
    const toolResults = await executeToolCalls(
      githubMcpClient.client,
      toolCalls
    )

    // Add tool results to the conversation
    messages.push(...toolResults)

    core.info('Tool results added, continuing conversation...')
  }

  core.warning(
    `GitHub MCP inference loop exceeded maximum iterations (${maxIterations})`
  )

  // Return the last assistant message content
  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find((msg) => msg.role === 'assistant')

  return lastAssistantMessage?.content || null
}
