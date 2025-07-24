# AI Spam Guard 🛡️

An AI-powered GitHub Action that automatically detects and moderates spam in issues and comments using OpenAI's language models.

## ✨ Recent Updates

**v2.0.0 - Major Refactoring** 
- 🔄 **Migrated from GitHub Models to OpenAI SDK** for better reliability and control
- 🧩 **Modular Architecture**: Extracted functionality into separate, testable modules
- 🎯 **Built-in Prompts**: No longer requires external prompt directory configuration
- 🛠️ **Improved Error Handling**: Better error messages and graceful failures
- 📦 **TypeScript Improvements**: Better type safety and code organization

## Features

- **🤖 OpenAI Integration**: Uses OpenAI's GPT models for accurate spam and AI-generated content detection
- **🎯 Dual Detection**: Separate detection for generic spam and AI-generated content
- **🏷️ Automatic Labeling**: Labels issues and comments with configurable labels
- **👻 Comment Minimization**: Automatically hides spam comments to reduce noise
- **📁 Modular Design**: Clean, maintainable code structure with separate services
- **🧪 Comprehensive Testing**: Full test coverage for all modules

## Architecture

The action is now organized into several focused modules:

- **`PromptService`**: Handles loading YAML prompts and OpenAI API interactions
- **`GitHubService`**: Manages GitHub API operations (labeling, comment minimization)
- **`ContentExtractor`**: Extracts content and metadata from GitHub webhook events
- **`index.ts`**: Main orchestrator that coordinates all services

## Usage

### Basic Setup

Add this action to your repository's workflow file (e.g., `.github/workflows/spam-guard.yml`):

```yaml
name: AI Spam Guard
on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  spam-detection:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/ai-spam-guard@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          spam-label: "spam"
          ai-label: "ai-generated"
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Configuration

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `token` | GitHub token with issues and pull-requests permissions | `${{ github.token }}` | No |
| `spam-label` | Label to add when generic spam is detected | `spam` | No |
| `ai-label` | Label to add when AI-generated content is detected | `ai-generated` | No |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for accessing GPT models | Yes |

## How It Works

1. **Event Trigger**: Action triggers on new issues, comments, or PR reviews
2. **Content Extraction**: Extracts text content from the GitHub event
3. **AI Analysis**: Sends content to OpenAI with specialized prompts for spam and AI detection
4. **Action Taking**: Based on results, labels the issue/PR and/or minimizes comments
5. **Logging**: Provides detailed logs of detection results and actions taken

## Detection Prompts

The action uses built-in YAML prompts located in the `prompts/` directory:

- **`spam-detection.prompt.yml`**: Detects promotional content, scams, and irrelevant posts
- **`ai-detection.prompt.yml`**: Identifies AI-generated content patterns
- **`bot-detection.prompt.yml`**: Identifies automated bot behavior
- **`link-spam-detection.prompt.yml`**: Focuses on suspicious links and URLs

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the action
npm run package

# Run linting
npm run lint
```

### Testing

The action includes comprehensive tests for all modules:

```bash
# Run all tests with coverage
npm run test

# Run tests in watch mode
npm run test:watch
```

### Module Structure

```
src/
├── index.ts              # Main orchestrator
├── prompt-service.ts     # OpenAI integration & prompt handling
├── github-service.ts     # GitHub API operations
└── content-extractor.ts  # Event content extraction

__tests__/
├── prompt-service.test.ts
├── github-service.test.ts
└── content-extractor.test.ts
```
