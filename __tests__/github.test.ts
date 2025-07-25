import { jest } from '@jest/globals'
import * as github from '@actions/github'
import { addLabels } from '../src/github'

// Mock the @actions/github module
const mockAddLabels = jest.fn<() => Promise<unknown>>()
const mockGraphql = jest.fn<() => Promise<unknown>>()

const mockOctokit = {
  rest: {
    issues: {
      addLabels: mockAddLabels
    }
  },
  graphql: mockGraphql
} as unknown as ReturnType<typeof github.getOctokit>

// Type for our mock context
type MockContext = typeof github.context

const mockContext = {
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  }
} as MockContext

describe('GitHub Service Functions', () => {
  beforeEach(() => {
    mockAddLabels.mockClear()
    mockGraphql.mockClear()
  })

  describe('addLabels', () => {
    it('should add labels to an issue', async () => {
      const issueNumber = 123
      const labels = ['spam', 'needs-review']

      mockAddLabels.mockResolvedValue({} as unknown)

      await addLabels(mockOctokit, mockContext, issueNumber, labels)

      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: issueNumber,
        labels
      })
    })

    it('should not call API when labels array is empty', async () => {
      const issueNumber = 123
      const labels: string[] = []

      await addLabels(mockOctokit, mockContext, issueNumber, labels)

      expect(mockAddLabels).not.toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      const issueNumber = 123
      const labels = ['spam']
      const error = new Error('API Error')

      mockAddLabels.mockRejectedValue(error)

      await expect(
        addLabels(mockOctokit, mockContext, issueNumber, labels)
      ).rejects.toThrow('API Error')
    })
  })
})
