import { jest } from '@jest/globals'
import * as core from '@actions/core'
import * as github from '@actions/github'
import OpenAI from 'openai'

// Mock all dependencies
jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('openai')
jest.mock('../src/content-extractor.js')
jest.mock('../src/prompt-service.js')
jest.mock('../src/github-service.js')

// Import the run function - we need to import after mocking
const mockCore = core as jest.Mocked<typeof core>
const mockGithub = github as jest.Mocked<typeof github>

// Mock the module imports
import { extractFromEvent, shouldProcess } from '../src/content-extractor.js'
import { evaluateContent } from '../src/prompt-service.js'
import { addLabels, minimizeComment } from '../src/github-service.js'

const mockExtractFromEvent = extractFromEvent as jest.MockedFunction<
  typeof extractFromEvent
>
const mockShouldProcess = shouldProcess as jest.MockedFunction<
  typeof shouldProcess
>
const mockEvaluateContent = evaluateContent as jest.MockedFunction<
  typeof evaluateContent
>
const mockAddLabels = addLabels as jest.MockedFunction<typeof addLabels>
const mockMinimizeComment = minimizeComment as jest.MockedFunction<
  typeof minimizeComment
>

const mockOctokit = {
  rest: { issues: { addLabels: jest.fn() } },
  graphql: jest.fn()
}

// Create a mock context object
const createMockContext = (eventName: string, payload: any) => ({
  eventName,
  payload,
  repo: { owner: 'testowner', repo: 'testrepo' }
})

describe('Main Function Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'token':
          return 'fake-token'
        case 'openai-api-key':
          return 'fake-openai-key'
        case 'spam-label':
          return 'spam'
        case 'ai-label':
          return 'ai-generated'
        default:
          return ''
      }
    })

    mockGithub.getOctokit.mockReturnValue(mockOctokit as any)

    // Mock github.context as a property descriptor
    Object.defineProperty(mockGithub, 'context', {
      value: createMockContext('issues', {
        action: 'opened',
        issue: {
          number: 123,
          node_id: 'issue-node-id',
          title: 'Test Issue',
          body: 'Test content',
          user: { login: 'testuser' }
        }
      }),
      writable: true,
      configurable: true
    })

    mockShouldProcess.mockReturnValue(true)
  })

  it('should process spam content and apply labels', async () => {
    const extractedContent = {
      content: 'Title: Test Issue\nBody: Buy now! Click here!',
      issueNumber: 123,
      commentNodeId: 'issue-node-id'
    }

    mockExtractFromEvent.mockReturnValue(extractedContent)
    mockEvaluateContent.mockResolvedValue({ spam: true, ai: false })

    // Import and run the function
    const { default: run } = await import('../src/index.js')
    await run()

    expect(mockExtractFromEvent).toHaveBeenCalledWith(mockGithub.context)
    expect(mockEvaluateContent).toHaveBeenCalledWith(
      expect.any(Object), // OpenAI instance
      expect.any(String), // prompts directory
      extractedContent.content
    )
    expect(mockAddLabels).toHaveBeenCalledWith(
      mockOctokit,
      mockGithub.context,
      123,
      ['spam']
    )
    expect(mockMinimizeComment).toHaveBeenCalledWith(
      mockOctokit,
      'issue-node-id'
    )
  })

  it('should process AI-generated content and apply labels', async () => {
    const extractedContent = {
      content: 'Title: Technical Issue\nBody: AI-generated content here',
      issueNumber: 123,
      commentNodeId: null
    }

    mockExtractFromEvent.mockReturnValue(extractedContent)
    mockEvaluateContent.mockResolvedValue({ spam: false, ai: true })

    const { default: run } = await import('../src/index.js')
    await run()

    expect(mockAddLabels).toHaveBeenCalledWith(
      mockOctokit,
      mockGithub.context,
      123,
      ['ai-generated']
    )
    expect(mockMinimizeComment).not.toHaveBeenCalled() // No comment node ID
  })

  it('should handle both spam and AI detection', async () => {
    const extractedContent = {
      content: 'Title: Spammy AI Issue\nBody: AI-generated spam content',
      issueNumber: 123,
      commentNodeId: 'issue-node-id'
    }

    mockExtractFromEvent.mockReturnValue(extractedContent)
    mockEvaluateContent.mockResolvedValue({ spam: true, ai: true })

    const { default: run } = await import('../src/index.js')
    await run()

    expect(mockAddLabels).toHaveBeenCalledWith(
      mockOctokit,
      mockGithub.context,
      123,
      ['spam', 'ai-generated']
    )
    expect(mockMinimizeComment).toHaveBeenCalledWith(
      mockOctokit,
      'issue-node-id'
    )
  })

  it('should handle clean content without applying labels', async () => {
    const extractedContent = {
      content: 'Title: Legitimate Issue\nBody: This is a real issue report',
      issueNumber: 123,
      commentNodeId: null
    }

    mockExtractFromEvent.mockReturnValue(extractedContent)
    mockEvaluateContent.mockResolvedValue({ spam: false, ai: false })

    const { default: run } = await import('../src/index.js')
    await run()

    expect(mockAddLabels).toHaveBeenCalledWith(
      mockOctokit,
      mockGithub.context,
      123,
      []
    )
    expect(mockMinimizeComment).not.toHaveBeenCalled()
  })

  it('should handle unsupported events gracefully', async () => {
    mockShouldProcess.mockReturnValue(false)

    const { default: run } = await import('../src/index.js')
    await run()

    expect(mockEvaluateContent).not.toHaveBeenCalled()
    expect(mockAddLabels).not.toHaveBeenCalled()
    expect(mockMinimizeComment).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const error = new Error('Test error')
    mockExtractFromEvent.mockImplementation(() => {
      throw error
    })

    const { default: run } = await import('../src/index.js')
    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith('Test error')
  })
})
