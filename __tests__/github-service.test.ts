import { jest } from '@jest/globals'
import { addLabels, minimizeComment } from '../src/github-service.js'

// Mock the @actions/github module
const mockOctokit = {
  rest: {
    issues: {
      addLabels: jest.fn() as jest.MockedFunction<any>
    }
  },
  graphql: jest.fn() as jest.MockedFunction<any>
}

const mockContext = {
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  }
}

describe('GitHub Service Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('addLabels', () => {
    it('should add labels to an issue', async () => {
      const issueNumber = 123
      const labels = ['spam', 'needs-review']

      mockOctokit.rest.issues.addLabels.mockResolvedValue({})

      await addLabels(
        mockOctokit as any,
        mockContext as any,
        issueNumber,
        labels
      )

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: issueNumber,
        labels
      })
    })

    it('should not call API when labels array is empty', async () => {
      const issueNumber = 123
      const labels: string[] = []

      await addLabels(
        mockOctokit as any,
        mockContext as any,
        issueNumber,
        labels
      )

      expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      const issueNumber = 123
      const labels = ['spam']
      const error = new Error('API Error')

      mockOctokit.rest.issues.addLabels.mockRejectedValue(error)

      await expect(
        addLabels(mockOctokit as any, mockContext as any, issueNumber, labels)
      ).rejects.toThrow('API Error')
    })
  })

  describe('minimizeComment', () => {
    it('should minimize a comment using GraphQL', async () => {
      const nodeId = 'comment-node-id-123'
      const expectedQuery = /* GraphQL */ `
        mutation ($nodeId: ID!) {
          minimizeComment(input: { subjectId: $nodeId, classifier: SPAM }) {
            minimizedComment {
              isMinimized
            }
          }
        }
      `

      mockOctokit.graphql.mockResolvedValue({
        minimizeComment: {
          minimizedComment: { isMinimized: true }
        }
      })

      await minimizeComment(mockOctokit as any, nodeId)

      expect(mockOctokit.graphql).toHaveBeenCalledWith(expectedQuery, {
        nodeId
      })
    })

    it('should handle GraphQL errors', async () => {
      const nodeId = 'comment-node-id-123'
      const error = new Error('GraphQL Error')

      mockOctokit.graphql.mockRejectedValue(error)

      await expect(minimizeComment(mockOctokit as any, nodeId)).rejects.toThrow(
        'GraphQL Error'
      )
    })
  })
})
