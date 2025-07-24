import * as github from "@actions/github";

/**
 * Add labels to an issue or PR (they share the same issue number).
 */
export async function addLabels(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
  issueNumber: number,
  labels: string[]
): Promise<void> {
  if (labels.length === 0) return;
  
  await octokit.rest.issues.addLabels({
    ...context.repo,
    issue_number: issueNumber,
    labels,
  });
}

/**
 * Hide (minimize) a comment using the GraphQL API.
 */
export async function minimizeComment(
  octokit: ReturnType<typeof github.getOctokit>,
  nodeId: string
): Promise<void> {
  const query = /* GraphQL */ `
    mutation ($nodeId: ID!) {
      minimizeComment(input: { subjectId: $nodeId, classifier: SPAM }) {
        minimizedComment { isMinimized }
      }
    }`;
  
  await octokit.graphql(query, { nodeId });
}
