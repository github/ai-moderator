import * as fs from "fs/promises";
import { join, basename } from "path";
import * as yaml from "js-yaml";
import type OpenAI from "openai";

interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PromptConfig {
  messages: PromptMessage[];
}

/**
 * Load and parse a prompt YAML file
 */
async function loadPrompt(promptPath: string): Promise<PromptConfig> {
  const content = await fs.readFile(promptPath, "utf-8");
  const config = yaml.load(content) as PromptConfig;
  
  if (!config?.messages || !Array.isArray(config.messages)) {
    throw new Error(`Invalid prompt format in ${promptPath}: missing messages array`);
  }

  return config;
}

/**
 * Run a single prompt through OpenAI and return true if the model
 * responded with "True" (case-insensitive).
 */
export async function promptSaysTrue(
  openai: OpenAI,
  promptPath: string,
  content: string
): Promise<boolean> {
  try {
    const promptConfig = await loadPrompt(promptPath);
    
    // Prepare messages by appending the content to the last user message
    const messages = promptConfig.messages.map((msg, index) => {
      if (msg.role === "user" && index === promptConfig.messages.length - 1) {
        return {
          ...msg,
          content: msg.content + content
        };
      }
      return msg;
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a cost-effective model for spam detection
      messages: messages,
      max_tokens: 10, // We only need "True" or "False"
      temperature: 0, // Make responses deterministic
    });

    const output = response.choices[0]?.message?.content?.trim() || "";
    return output.toLowerCase().startsWith("true");
  } catch (error) {
    console.error(`Error running prompt ${promptPath}:`, error);
    throw error;
  }
}

/**
 * Get all prompt files from a directory
 */
export async function getPromptFiles(promptsDir: string): Promise<string[]> {
  const files = await fs.readdir(promptsDir);
  return files
    .filter((f: string) => f.endsWith(".prompt.yml"))
    .map((f: string) => join(promptsDir, f));
}

/**
 * Evaluate content against all prompts in a directory
 */
export async function evaluateContent(
  openai: OpenAI,
  promptsDir: string,
  content: string
): Promise<{ spam: boolean; ai: boolean }> {
  const files = await getPromptFiles(promptsDir);
  const flags = { spam: false, ai: false };

  for (const file of files) {
    const filename = basename(file).toLowerCase();
    const isAIPrompt = filename.includes("ai-detection");
    const isSpamPrompt = filename.includes("spam-detection") || filename.includes("bot-detection") || filename.includes("link-spam");
    
    if (!isAIPrompt && !isSpamPrompt) {
      continue; // Skip unknown prompt types
    }

    try {
      const result = await promptSaysTrue(openai, file, content);
      console.log(`${basename(file)} → ${result}`);
      
      if (result) {
        if (isAIPrompt) {
          flags.ai = true;
        } else if (isSpamPrompt) {
          flags.spam = true;
        }
      }
    } catch (error) {
      console.error(`Error evaluating prompt ${basename(file)}:`, error);
      // Continue with other prompts even if one fails
    }
  }

  return flags;
}
