import { jest } from '@jest/globals';
import { readFile, readdir } from 'fs/promises';
import { promptSaysTrue, getPromptFiles, evaluateContent } from '../src/prompt-service.js';

// Mock fs/promises
jest.mock('fs/promises');
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;

// Mock js-yaml
jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

import * as yaml from 'js-yaml';
const mockYamlLoad = yaml.load as jest.MockedFunction<typeof yaml.load>;

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn() as jest.MockedFunction<any>
    }
  }
};

describe('Prompt Service Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('promptSaysTrue', () => {
    it('should return true when OpenAI responds with "True"', async () => {
      const promptConfig = {
        messages: [
          { role: 'system' as const, content: 'You are a spam detector.' },
          { role: 'user' as const, content: 'Is this spam: ' }
        ]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'True' } }]
      });

      const result = await promptSaysTrue(mockOpenAI as any, 'test.prompt.yml', 'Buy now!');

      expect(result).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a spam detector.' },
          { role: 'user', content: 'Is this spam: Buy now!' }
        ],
        max_tokens: 10,
        temperature: 0
      });
    });

    it('should return false when OpenAI responds with "False"', async () => {
      const promptConfig = {
        messages: [
          { role: 'user' as const, content: 'Is this spam: ' }
        ]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'False' } }]
      });

      const result = await promptSaysTrue(mockOpenAI as any, 'test.prompt.yml', 'Hello world');

      expect(result).toBe(false);
    });

    it('should handle case-insensitive responses', async () => {
      const promptConfig = {
        messages: [{ role: 'user' as const, content: 'Test: ' }]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'TRUE' } }]
      });

      const result = await promptSaysTrue(mockOpenAI as any, 'test.prompt.yml', 'content');

      expect(result).toBe(true);
    });

    it('should handle OpenAI API errors', async () => {
      const promptConfig = {
        messages: [{ role: 'user' as const, content: 'Test: ' }]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(
        promptSaysTrue(mockOpenAI as any, 'test.prompt.yml', 'content')
      ).rejects.toThrow('API Error');
    });
  });

  describe('getPromptFiles', () => {
    it('should return only .prompt.yml files', async () => {
      mockReaddir.mockResolvedValue([
        'spam-detection.prompt.yml',
        'ai-detection.prompt.yml',
        'other-file.txt',
        'config.json'
      ] as any);

      const result = await getPromptFiles('/prompts');

      expect(result).toEqual([
        '/prompts/spam-detection.prompt.yml',
        '/prompts/ai-detection.prompt.yml'
      ]);
    });

    it('should handle empty directories', async () => {
      mockReaddir.mockResolvedValue([] as any);

      const result = await getPromptFiles('/prompts');

      expect(result).toEqual([]);
    });
  });

  describe('evaluateContent', () => {
    beforeEach(() => {
      mockReaddir.mockResolvedValue([
        'spam-detection.prompt.yml',
        'ai-detection.prompt.yml',
        'other.prompt.yml'
      ] as any);
    });

    it('should detect spam and AI content', async () => {
      const promptConfig = {
        messages: [{ role: 'user' as const, content: 'Test: ' }]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({ choices: [{ message: { content: 'True' } }] }) // spam
        .mockResolvedValueOnce({ choices: [{ message: { content: 'True' } }] }); // ai

      const result = await evaluateContent(mockOpenAI as any, '/prompts', 'suspicious content');

      expect(result).toEqual({ spam: true, ai: true });
    });

    it('should handle no detection', async () => {
      const promptConfig = {
        messages: [{ role: 'user' as const, content: 'Test: ' }]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({ choices: [{ message: { content: 'False' } }] }) // spam
        .mockResolvedValueOnce({ choices: [{ message: { content: 'False' } }] }); // ai

      const result = await evaluateContent(mockOpenAI as any, '/prompts', 'normal content');

      expect(result).toEqual({ spam: false, ai: false });
    });

    it('should continue evaluation even if one prompt fails', async () => {
      const promptConfig = {
        messages: [{ role: 'user' as const, content: 'Test: ' }]
      };

      mockReadFile.mockResolvedValue('messages: []');
      mockYamlLoad.mockReturnValue(promptConfig);
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('API Error')) // spam fails
        .mockResolvedValueOnce({ choices: [{ message: { content: 'True' } }] }); // ai succeeds

      const result = await evaluateContent(mockOpenAI as any, '/prompts', 'content');

      expect(result).toEqual({ spam: false, ai: true });
    });
  });
});
