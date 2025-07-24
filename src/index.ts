import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import { OpenAI } from 'openai'
import { evaluateContent } from './prompt.js'
import { addLabels, minimizeComment } from './github.js'
import { extractFromEvent, shouldProcess } from './content-extractor.js'

async function run(): Promise<void> {
  try {
    //------------------------------------------------------------
    // 0. Inputs & setup
    //------------------------------------------------------------
    const token = core.getInput('token')
    const promptsDir = path.resolve(__dirname, '..', 'prompts') // Use built-in prompts
    const spamLabel = core.getInput('spam-label')
    const aiLabel = core.getInput('ai-label')

    // Initialize services
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    const octokit = github.getOctokit(token)

    //------------------------------------------------------------
    // 1. Check if we should process this event
    //------------------------------------------------------------
    if (!shouldProcess(github.context)) {
      const event = github.context.eventName
      core.info(`Nothing to do for event ${event}.`)
      return
    }

    //------------------------------------------------------------
    // 2. Extract content and identifiers
    //------------------------------------------------------------
    const { content, issueNumber, commentNodeId } = extractFromEvent(
      github.context
    )

    if (!content.trim()) {
      core.info('No text content found, skipping.')
      return
    }

    //------------------------------------------------------------
    // 3. Evaluate content against prompts
    //------------------------------------------------------------
    core.info('Evaluating content for spam and AI-generated content...')
    const flags = await evaluateContent(openai, promptsDir, content)

    if (!flags.spam && !flags.ai) {
      core.info('No spam detected ✅')
      return
    }

    //------------------------------------------------------------
    // 4. Take action: label or hide
    //------------------------------------------------------------
    const labels: string[] = []
    if (flags.spam) labels.push(spamLabel)
    if (flags.ai) labels.push(aiLabel)

    if (issueNumber) {
      await addLabels(octokit, github.context, issueNumber, labels)
      core.info(`Added labels [${labels.join(', ')}] to issue #${issueNumber}`)
    }

    if (commentNodeId) {
      await minimizeComment(octokit, commentNodeId)
      core.info(`Comment ${commentNodeId} minimized as spam`)
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()

export default run
