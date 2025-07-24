import * as github from '@actions/github'

export interface ContentInfo {
  content: string
  issueNumber: number | null
  commentNodeId: string | null
}

/**
 * Extract content and identifiers from GitHub webhook events
 */
export function extractFromEvent(context: typeof github.context): ContentInfo {
  const event = context.eventName

  let content = ''
  let issueNumber: number | null = null
  let commentNodeId: string | null = null

  if (event === 'issues' && context.payload.action === 'opened') {
    content = `${context.payload.issue?.title}\n${context.payload.issue?.body}`
    issueNumber = context.payload.issue?.number ?? null
  } else if (
    event === 'issue_comment' &&
    context.payload.action === 'created'
  ) {
    content = context.payload.comment?.body || ''
    issueNumber = context.payload.issue?.number ?? null
    commentNodeId = context.payload.comment?.node_id
  } else if (
    event === 'pull_request_review_comment' &&
    context.payload.action === 'created'
  ) {
    content = context.payload.comment?.body || ''
    issueNumber = context.payload.pull_request?.number ?? null
    commentNodeId = context.payload.comment?.node_id
  }

  return {
    content,
    issueNumber,
    commentNodeId
  }
}

/**
 * Check if the current event should be processed
 */
export function shouldProcess(context: typeof github.context): boolean {
  const event = context.eventName

  return (
    (event === 'issues' && context.payload.action === 'opened') ||
    (event === 'issue_comment' && context.payload.action === 'created') ||
    (event === 'pull_request_review_comment' &&
      context.payload.action === 'created')
  )
}
