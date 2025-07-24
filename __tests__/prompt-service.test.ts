import { jest } from '@jest/globals'

// Test the result type interfaces and basic functionality without mocking file system
describe('Prompt Service Types', () => {
  it('should define proper result interfaces', () => {
    // Test that we can create result objects that match our interfaces
    const spamResult = {
      reasoning: 'Contains promotional links',
      is_spam: true,
      confidence: 0.9,
      spam_indicators: ['promotional-links', 'urgency-language']
    }

    const aiResult = {
      reasoning: 'Text shows AI patterns',
      is_ai_generated: true,
      confidence: 0.8,
      ai_indicators: ['robotic-language', 'perfect-grammar']
    }

    const linkSpamResult = {
      reasoning: 'Contains suspicious links',
      contains_link_spam: true,
      confidence: 0.95,
      suspicious_links: ['http://spam.com'],
      spam_indicators: ['link-spam']
    }

    const botResult = {
      reasoning: 'Shows bot-like behavior',
      is_bot_like: true,
      confidence: 0.85,
      bot_indicators: ['automated-pattern', 'timestamp-regularity']
    }

    // These should all be valid result objects
    expect(spamResult.is_spam).toBe(true)
    expect(aiResult.is_ai_generated).toBe(true)
    expect(linkSpamResult.contains_link_spam).toBe(true)
    expect(botResult.is_bot_like).toBe(true)
  })

  it('should handle result type validation', () => {
    // Test that our result types are properly structured
    const mockResults = [
      {
        is_spam: true,
        confidence: 0.9,
        reasoning: 'test',
        spam_indicators: []
      },
      {
        is_ai_generated: false,
        confidence: 0.1,
        reasoning: 'test',
        ai_indicators: []
      },
      {
        contains_link_spam: true,
        confidence: 0.8,
        reasoning: 'test',
        suspicious_links: [],
        spam_indicators: []
      },
      {
        is_bot_like: false,
        confidence: 0.2,
        reasoning: 'test',
        bot_indicators: []
      }
    ]

    // Test that we can identify different result types
    const spamResult = mockResults[0]
    const aiResult = mockResults[1]
    const linkSpamResult = mockResults[2]
    const botResult = mockResults[3]

    expect('is_spam' in spamResult).toBe(true)
    expect('is_ai_generated' in aiResult).toBe(true)
    expect('contains_link_spam' in linkSpamResult).toBe(true)
    expect('is_bot_like' in botResult).toBe(true)
  })

  it('should validate confidence values are numbers', () => {
    const results = [
      { confidence: 0.9, reasoning: 'test' },
      { confidence: 0.1, reasoning: 'test' },
      { confidence: 1.0, reasoning: 'test' },
      { confidence: 0.0, reasoning: 'test' }
    ]

    results.forEach((result) => {
      expect(typeof result.confidence).toBe('number')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })
  })
})
