# AI Spam Guard

An AI-powered GitHub Action that automatically detects and moderates spam in
issues and comments using GitHub Models language models.

## Usage

### Basic Setup

Add this action to your repository's workflow file (e.g.,
`.github/workflows/spam-guard.yml`):

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
      models: read
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/ai-spam-guard
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          spam-label: 'spam'
          ai-label: 'ai-generated'
          minimize-detected-comments: true
```

### Configuration

| Input                        | Description                                            | Default               | Required |
| ---------------------------- | ------------------------------------------------------ | --------------------- | -------- |
| `token`                      | GitHub token with issues and pull-requests permissions | `${{ github.token }}` | No       |
| `spam-label`                 | Label to add when generic spam is detected             | `spam`                | No       |
| `ai-label`                   | Label to add when AI-generated content is detected     | `ai-generated`        | No       |
| `minimize-detected-comments` | Whether to minimize comments detected as spam          | `true`                | No       |

### Inference

The action does not require any external API keys for inference - it uses the
built-in GitHub token with `models: read` permission to access GitHub Models.

Every GitHub user has Github Models inference for free, but if you're running
into rate limiting issues you can choose to
[opt in to paid usage](https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-models).

## Detection Prompts

The action uses built-in YAML prompts located in the `prompts/` directory:

- **`spam-detection.prompt.yml`**: Detects promotional content, scams, and
  irrelevant posts
- **`ai-detection.prompt.yml`**: Identifies AI-generated content patterns
- **`bot-detection.prompt.yml`**: Identifies automated bot behavior
- **`link-spam-detection.prompt.yml`**: Focuses on suspicious links and URLs

You can iterate on or tweak these prompts via the
[Models tab](https://github.com/github/ai-spam-guard/models) on this repository.
If you want to push an update to this prompt, please also include updated test
data so we can see the effect of the prompt update.

## Development

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
