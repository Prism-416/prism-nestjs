const MENTION_PATTERN =
  /(^|[^\p{L}\p{N}_@])@([\p{L}\p{N}._-]{2,30})(?=$|[^\p{L}\p{N}._-])/gu;

export function extractMentionUsernames(body: string): string[] {
  const usernames: string[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const username = match[2];
    if (!username) {
      continue;
    }

    const key = username.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    usernames.push(key);
  }

  return usernames;
}
