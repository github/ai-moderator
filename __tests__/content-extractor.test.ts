import { jest } from '@jest/globals'
import { extractFromEvent, shouldProcess } from '../src/content-extractor.js'

describe('Content Extractor Functions', () => {
  describe('extractFromEvent', () => {
    it('should extract content from issue opened event', () => {
      const context = {
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

      const result = extractFromEvent(context as any)

      expect(result).toEqual({
        content: 'Bug Report\nThis is a bug description',
        issueNumber: 123,
        commentNodeId: null
      })
    })

    it('should extract content from issue comment created event', () => {
      const context = {
        eventName: 'issue_comment',
        payload: {
          action: 'created',
          comment: {
            body: 'This is a comment',
            node_id: 'comment-node-123'
          },
          issue: {
            number: 456
          }
        }
      }

      const result = extractFromEvent(context as any)

      expect(result).toEqual({
        content: 'This is a comment',
        issueNumber: 456,
        commentNodeId: 'comment-node-123'
      })
    })

    it('should extract content from pull request review comment created event', () => {
      const context = {
        eventName: 'pull_request_review_comment',
        payload: {
          action: 'created',
          comment: {
            body: 'Consider refactoring this',
            node_id: 'review-comment-node-789'
          },
          pull_request: {
            number: 789
          }
        }
      }

      const result = extractFromEvent(context as any)

      expect(result).toEqual({
        content: 'Consider refactoring this',
        issueNumber: 789,
        commentNodeId: 'review-comment-node-789'
      })
    })

    it('should handle missing body content', () => {
      const context = {
        eventName: 'issues',
        payload: {
          action: 'opened',
          issue: {
            number: 123,
            title: 'Issue without body',
            body: null
          }
        }
      }

      const result = extractFromEvent(context as any)

      expect(result).toEqual({
        content: 'Issue without body\nnull',
        issueNumber: 123,
        commentNodeId: null
      })
    })

    it('should handle unsupported events by returning empty content', () => {
      const context = {
        eventName: 'star',
        payload: {
          action: 'created'
        }
      }

      const result = extractFromEvent(context as any)

      expect(result).toEqual({
        content: '',
        issueNumber: null,
        commentNodeId: null
      })
    })
  })

  describe('shouldProcess', () => {
    it('should return true for issues opened event', () => {
      const context = {
        eventName: 'issues',
        payload: { action: 'opened' }
      }

      const result = shouldProcess(context as any)
      expect(result).toBe(true)
    })

    it('should return true for issue comment created event', () => {
      const context = {
        eventName: 'issue_comment',
        payload: { action: 'created' }
      }

      const result = shouldProcess(context as any)
      expect(result).toBe(true)
    })

    it('should return true for pull request review comment created event', () => {
      const context = {
        eventName: 'pull_request_review_comment',
        payload: { action: 'created' }
      }

      const result = shouldProcess(context as any)
      expect(result).toBe(true)
    })

    it('should return false for unsupported events', () => {
      const context = {
        eventName: 'star',
        payload: { action: 'created' }
      }

      const result = shouldProcess(context as any)
      expect(result).toBe(false)
    })

    it('should return false for unsupported actions', () => {
      const context = {
        eventName: 'issues',
        payload: { action: 'closed' }
      }

      const result = shouldProcess(context as any)
      expect(result).toBe(false)
    })
  })
})
