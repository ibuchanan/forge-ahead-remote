/**
 * Extracts the Jira cloud identifier (`cloudId`) from an Atlassian Resource
 * Identifier (ARI) for a Jira site.
 *
 * Returns `undefined` when the input is not a Jira site ARI or is malformed.
 *
 * Example: `ari:cloud:jira::site/abc-123` → `abc-123`
 */
export function extractCloudId(ari: string | undefined): string | undefined {
  if (ari === undefined) {
    return undefined;
  }
  const match = /^ari:cloud:jira::site\/(.+)$/.exec(ari);
  return match?.[1];
}
