import * as core from '@actions/core'
import * as fs from 'fs'
import * as yaml from 'js-yaml'

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PromptConfig {
  messages: PromptMessage[]
  model?: string
  responseFormat?: 'text' | 'json_schema'
  jsonSchema?: string
}

export interface TemplateVariables {
  [key: string]: string
}

/**
 * Parse template variables from YAML input string
 */
export function parseTemplateVariables(input: string): TemplateVariables {
  if (!input.trim()) {
    return {}
  }

  try {
    const parsed = yaml.load(input) as TemplateVariables
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Template variables must be a YAML object')
    }
    return parsed
  } catch (error) {
    throw new Error(
      `Failed to parse template variables: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Replace template variables in text using {{variable}} syntax
 */
export function replaceTemplateVariables(
  text: string,
  variables: TemplateVariables
): string {
  return text.replace(/\{\{([\w.-]+)\}\}/g, (match, variableName) => {
    if (variableName in variables) {
      return variables[variableName]
    }
    core.warning(
      `Template variable '${variableName}' not found in input variables`
    )
    return match // Return the original placeholder if variable not found
  })
}

/**
 * Load and parse a prompt YAML file with template variable substitution
 */
export function loadPromptFile(
  filePath: string,
  templateVariables: TemplateVariables = {}
): PromptConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`)
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')

  // Apply template variable substitution
  const processedContent = replaceTemplateVariables(
    fileContent,
    templateVariables
  )

  try {
    const config = yaml.load(processedContent) as PromptConfig

    if (!config.messages || !Array.isArray(config.messages)) {
      throw new Error('Prompt file must contain a "messages" array')
    }

    // Validate messages
    for (const message of config.messages) {
      if (!message.role || !message.content) {
        throw new Error(
          'Each message must have "role" and "content" properties'
        )
      }
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`)
      }
    }

    return config
  } catch (error) {
    throw new Error(
      `Failed to parse prompt file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Check if a file is a prompt YAML file based on extension
 */
export function isPromptYamlFile(filePath: string): boolean {
  return filePath.endsWith('.prompt.yml') || filePath.endsWith('.prompt.yaml')
}
