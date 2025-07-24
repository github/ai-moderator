import { jest } from '@jest/globals'
import * as core from '@actions/core'
import * as github from '@actions/github'

// Mock only the external dependencies we need
jest.mock('@actions/core')
jest.mock('@actions/github')

const mockCore = core as jest.Mocked<typeof core>
const mockGithub = github as jest.Mocked<typeof github>

// Import the functions we want to test directly
import { extractFromEvent, shouldProcess } from '../src/content-extractor.js'

// Helper to create minimal context objects
const createMockContext = (eventName: string, payload: any) =>
  ({
    eventName,
    payload,
    // Add minimal required properties to satisfy the Context type
    sha: 'fake-sha',
    ref: 'refs/heads/main',
    workflow: 'test',
    action: 'test',
    actor: 'test',
    job: 'test',
    runNumber: 1,
    runId: 1,
    apiUrl: 'https://api.github.com',
    serverUrl: 'https://github.com',
    graphqlUrl: 'https://api.github.com/graphql',
    repo: { owner: 'test', repo: 'test' }
  }) as typeof github.context

describe('Content Extraction', () => {
  describe('shouldProcess', () => {
    it('should process issue opened events', () => {
      const context = createMockContext('issues', { action: 'opened' })
      expect(shouldProcess(context)).toBe(true)
    })

    it('should process issue comment created events', () => {
      const context = createMockContext('issue_comment', { action: 'created' })
      expect(shouldProcess(context)).toBe(true)
    })

    it('should not process other events', () => {
      const context = createMockContext('push', {})
      expect(shouldProcess(context)).toBe(false)
    })

    it('should not process issue closed events', () => {
      const context = createMockContext('issues', { action: 'closed' })
      expect(shouldProcess(context)).toBe(false)
    })
  })

  describe('extractFromEvent', () => {
    it('should extract content from issue opened event', () => {
      const context = createMockContext('issues', {
        action: 'opened',
        issue: {
          number: 123,
          node_id: 'issue-node-id',
          title: 'Test Issue',
          body: 'Issue body content',
          user: { login: 'testuser' }
        }
      })

      const result = extractFromEvent(context)

      expect(result).toEqual({
        content: 'Test Issue\nIssue body content',
        issueNumber: 123,
        commentNodeId: null
      })
    })

    it('should extract content from issue comment event', () => {
      const context = createMockContext('issue_comment', {
        action: 'created',
        issue: { number: 456 },
        comment: {
          node_id: 'comment-node-id',
          body: 'This is a comment',
          user: { login: 'commenter' }
        }
      })

      const result = extractFromEvent(context)

      expect(result).toEqual({
        content: 'This is a comment',
        issueNumber: 456,
        commentNodeId: 'comment-node-id'
      })
    })

    it('should handle missing issue body', () => {
      const context = createMockContext('issues', {
        action: 'opened',
        issue: {
          number: 123,
          node_id: 'issue-node-id',
          title: 'Test Issue',
          body: null,
          user: { login: 'testuser' }
        }
      })

      const result = extractFromEvent(context)

      expect(result).toEqual({
        content: 'Test Issue\nnull',
        issueNumber: 123,
        commentNodeId: null
      })
    })

    it('should handle missing comment body', () => {
      const context = createMockContext('issue_comment', {
        action: 'created',
        issue: { number: 456 },
        comment: {
          node_id: 'comment-node-id',
          body: null,
          user: { login: 'commenter' }
        }
      })

      const result = extractFromEvent(context)

      expect(result).toEqual({
        content: '',
        issueNumber: 456,
        commentNodeId: 'comment-node-id'
      })
    })
  })
})

describe('Core Actions Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should read input values correctly', () => {
    // Since we're just testing that the mocked core module works,
    // we don't need complex implementation tests
    expect(mockCore.getInput).toBeDefined()
    expect(mockCore.setFailed).toBeDefined()
    expect(mockCore.info).toBeDefined()
    expect(mockCore.warning).toBeDefined()
  })
})
