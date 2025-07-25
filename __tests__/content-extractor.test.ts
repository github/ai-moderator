import * as github from '@actions/github'
import { extractFromEvent, shouldProcess } from '../src/content-extractor.js'

// Helper type for creating mock GitHub context objects
type MockContext = Pick<typeof github.context, 'eventName' | 'payload'>

describe('Content Extractor Functions', () => {
  describe('extractFromEvent', () => {
    it('should extract content from issue opened event', () => {
      const context: MockContext = {
        eventName: 'issues',
        payload: {
          action: 'opened',
          issue: {
            number: 123,
            title: 'Bug Report',
            body: 'This is a bug description'
          }
        }
      }

      const result = extractFromEvent(context as typeof github.context)

      expect(result).toEqual({
        content: 'Bug Report\nThis is a bug description',
        issueNumber: 123,
        commentNodeId: null
      })
    })

    it('should extract content from issue comment created event', () => {
      const context: MockContext = {
        eventName: 'issue_comment',
        payload: {
          action: 'created',
          comment: {
            id: 1,
            body: 'This is a comment',
            node_id: 'comment-node-123'
          },
          issue: {
            number: 456
          }
        }
      }

      const result = extractFromEvent(context as typeof github.context)

      expect(result).toEqual({
        content: 'This is a comment',
        issueNumber: 456,
        commentNodeId: 'comment-node-123'
      })
    })

    it('should extract content from pull request review comment created event', () => {
      const context: MockContext = {
        eventName: 'pull_request_review_comment',
        payload: {
          action: 'created',
          comment: {
            id: 2,
            body: 'Consider refactoring this',
            node_id: 'review-comment-node-789'
          },
          pull_request: {
            number: 789
          }
        }
      }

      const result = extractFromEvent(context as typeof github.context)

      expect(result).toEqual({
        content: 'Consider refactoring this',
        issueNumber: 789,
        commentNodeId: 'review-comment-node-789'
      })
    })

    it('should handle missing body content', () => {
      const context: MockContext = {
        eventName: 'issues',
        payload: {
          action: 'opened',
          issue: {
            number: 123,
            title: 'Issue without body',
            body: undefined
          }
        }
      }

      const result = extractFromEvent(context as typeof github.context)

      expect(result).toEqual({
        content: 'Issue without body\nundefined',
        issueNumber: 123,
        commentNodeId: null
      })
    })

    it('should handle unsupported events by returning empty content', () => {
      const context: MockContext = {
        eventName: 'star',
        payload: {
          action: 'created'
        }
      }

      const result = extractFromEvent(context as typeof github.context)

      expect(result).toEqual({
        content: '',
        issueNumber: null,
        commentNodeId: null
      })
    })
  })

  describe('shouldProcess', () => {
    it('should return true for issues opened event', () => {
      const context: MockContext = {
        eventName: 'issues',
        payload: { action: 'opened' }
      }

      const result = shouldProcess(context as typeof github.context)
      expect(result).toBe(true)
    })

    it('should return true for issue comment created event', () => {
      const context: MockContext = {
        eventName: 'issue_comment',
        payload: { action: 'created' }
      }

      const result = shouldProcess(context as typeof github.context)
      expect(result).toBe(true)
    })

    it('should return true for pull request review comment created event', () => {
      const context: MockContext = {
        eventName: 'pull_request_review_comment',
        payload: { action: 'created' }
      }

      const result = shouldProcess(context as typeof github.context)
      expect(result).toBe(true)
    })

    it('should return false for unsupported events', () => {
      const context: MockContext = {
        eventName: 'star',
        payload: { action: 'created' }
      }

      const result = shouldProcess(context as typeof github.context)
      expect(result).toBe(false)
    })

    it('should return false for unsupported actions', () => {
      const context: MockContext = {
        eventName: 'issues',
        payload: { action: 'closed' }
      }

      const result = shouldProcess(context as typeof github.context)
      expect(result).toBe(false)
    })
  })
})
