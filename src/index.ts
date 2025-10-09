import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { OpenAI } from 'openai'
import { evaluateContent } from './prompt.js'
import { addLabels, minimizeComment } from './github.js'
import { extractFromEvent, shouldProcess } from './content-extractor.js'

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const promptsDir = path.resolve(__dirname, '..', 'prompts') // Use built-in prompts
    const spamLabel = core.getInput('spam-label')
    const aiLabel = core.getInput('ai-label')
    const minimizeComments = core.getBooleanInput('minimize-detected-comments')
    const customPromptPath = core.getInput('custom-prompt-path')
    const endpoint = core.getInput('endpoint')

    // Built-in prompt configuration
    const enableSpamDetection = core.getBooleanInput('enable-spam-detection')
    const enableLinkSpamDetection = core.getBooleanInput(
      'enable-link-spam-detection'
    )
    const enableAiDetection = core.getBooleanInput('enable-ai-detection')

    const openai = new OpenAI({
      apiKey: token,
      baseURL: endpoint
    })
    const octokit = github.getOctokit(token)

    if (!shouldProcess(github.context)) {
      const event = github.context.eventName
      core.info(`Nothing to do for event ${event}.`)
      return
    }

    const { content, issueNumber, commentNodeId } = extractFromEvent(
      github.context
    )

    if (!content.trim()) {
      core.info('No text content found, skipping.')
      return
    }

    core.info('Evaluating content for spam and AI-generated content...')
    const flags = await evaluateContent(
      openai,
      promptsDir,
      content,
      customPromptPath,
      {
        enableSpamDetection,
        enableLinkSpamDetection,
        enableAiDetection
      }
    )

    if (!flags.spam && !flags.ai) {
      core.info('No spam or AI-generated content detected ✅')
      return
    }

    const labels: string[] = []

    // Only add labels to issues if the issue content itself has the problem
    // (not if it's just a comment on the issue)
    if (issueNumber && !commentNodeId) {
      if (flags.spam) labels.push(spamLabel)
      if (flags.ai) labels.push(aiLabel)
    }

    if (issueNumber && labels.length > 0) {
      await addLabels(octokit, github.context, issueNumber, labels)
      core.info(`Added labels [${labels.join(', ')}] to issue #${issueNumber}`)
    }

    // Only minimize comments if they are spam, not just AI-generated
    // and if minimize-detected-comments is enabled
    if (commentNodeId && flags.spam && minimizeComments) {
      await minimizeComment(octokit, commentNodeId)
      core.info(`Comment ${commentNodeId} minimized as spam`)
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()

export default run
