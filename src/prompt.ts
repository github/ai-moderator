import * as fs from 'fs/promises'
import { join, basename } from 'path'
import * as yaml from 'js-yaml'
import type { OpenAI } from 'openai'

interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PromptConfig {
  messages: PromptMessage[]
  model?: string
  responseFormat?: string
  jsonSchema?: string
}

// Response interfaces for different detection types
interface SpamDetectionResult {
  reasoning: string
  is_spam: boolean
  confidence: number
  spam_indicators: string[]
}

interface AIDetectionResult {
  reasoning: string
  is_ai_generated: boolean
  confidence: number
  ai_indicators: string[]
}

interface LinkSpamDetectionResult {
  reasoning: string
  contains_link_spam: boolean
  confidence: number
  suspicious_links: string[]
  spam_indicators: string[]
}

interface BotDetectionResult {
  reasoning: string
  is_bot_like: boolean
  confidence: number
  bot_indicators: string[]
}

type DetectionResult =
  | SpamDetectionResult
  | AIDetectionResult
  | LinkSpamDetectionResult
  | BotDetectionResult

/**
 * Load and parse a prompt YAML file
 */
async function loadPrompt(promptPath: string): Promise<PromptConfig> {
  const content = await fs.readFile(promptPath, 'utf-8')
  const config = yaml.load(content) as PromptConfig

  if (!config?.messages || !Array.isArray(config.messages)) {
    throw new Error(
      `Invalid prompt format in ${promptPath}: missing messages array`
    )
  }

  return config
}

/**
 * Run a single prompt through OpenAI and return the parsed JSON result
 */
export async function runPrompt(
  openai: OpenAI,
  promptPath: string,
  content: string
): Promise<DetectionResult> {
  try {
    const promptConfig = await loadPrompt(promptPath)

    // Prepare messages by replacing {{stdin}} template with actual content
    const messages = promptConfig.messages.map((msg) => {
      return {
        ...msg,
        content: msg.content.replace('{{stdin}}', content)
      }
    })

    // Prepare the API call parameters
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: promptConfig.model || 'gpt-4o',
      messages: messages,
      temperature: 0 // Make responses deterministic
    }

    // Add JSON schema parameters if present
    if (
      promptConfig.responseFormat === 'json_schema' &&
      promptConfig.jsonSchema
    ) {
      params.response_format = {
        type: 'json_schema',
        json_schema: JSON.parse(promptConfig.jsonSchema)
      }
    }

    const response = await openai.chat.completions.create(params)

    const output = response.choices[0]?.message?.content?.trim() || ''

    try {
      return JSON.parse(output) as DetectionResult
    } catch (parseError) {
      console.error(
        `Error parsing JSON response from ${promptPath}:`,
        parseError
      )
      console.error(`Raw response: ${output}`)
      throw new Error(`Invalid JSON response from prompt: ${output}`)
    }
  } catch (error) {
    console.error(`Error running prompt ${promptPath}:`, error)
    throw error
  }
}

/**
 * Get all prompt files from a directory
 */
export async function getPromptFiles(promptsDir: string): Promise<string[]> {
  const files = await fs.readdir(promptsDir)
  return files
    .filter((f: string) => f.endsWith('.prompt.yml'))
    .map((f: string) => join(promptsDir, f))
}

/**
 * Evaluate content against all prompts in a directory
 */
export async function evaluateContent(
  openai: OpenAI,
  promptsDir: string,
  content: string
): Promise<{ spam: boolean; ai: boolean }> {
  const files = await getPromptFiles(promptsDir)
  const flags = { spam: false, ai: false }

  for (const file of files) {
    const filename = basename(file).toLowerCase()
    const isAIPrompt = filename.includes('ai-detection')
    const isSpamPrompt =
      filename.includes('spam-detection') ||
      filename.includes('bot-detection') ||
      filename.includes('link-spam')

    if (!isAIPrompt && !isSpamPrompt) {
      continue // Skip unknown prompt types
    }

    try {
      const result = await runPrompt(openai, file, content)

      let isDetected = false
      if ('is_spam' in result) {
        isDetected = result.is_spam
      }

      // Log the detailed results
      console.log(`\n=== ${basename(file)} ===`)
      console.log(`Result: ${isDetected}`)
      console.log(`Reasoning: ${result.reasoning}`)

      if (isDetected) {
        if (isAIPrompt) {
          flags.ai = true
        } else if (isSpamPrompt) {
          flags.spam = true
        }
      }
    } catch (error) {
      // Continue with other prompts even if one fails
      console.error(`Error evaluating prompt ${basename(file)}:`, error)
    }
  }

  return flags
}
