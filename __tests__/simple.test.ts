import { extractFromEvent, shouldProcess } from '../src/content-extractor.js'

describe('Basic Content Extractor Test', () => {
  it('should work with simple extraction', () => {
    const context = {
      eventName: 'issues',
      payload: {
        action: 'opened',
        issue: {
          number: 123,
          title: 'Test',
          body: 'Body'
        }
      }
    }

    const result = extractFromEvent(context as any)
    expect(result.content).toBe('Test\nBody')
    expect(result.issueNumber).toBe(123)
    expect(result.commentNodeId).toBeNull()
  })
})
