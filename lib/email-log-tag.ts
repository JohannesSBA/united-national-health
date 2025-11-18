const EMAIL_LOG_TAG_PATTERN = /\[emailLog:([^\]]+)\]/;

export function formatEmailLogTag(emailLogId: string) {
  return ` [emailLog:${emailLogId}]`;
}

export function extractEmailLogId(text: string) {
  const match = text.match(EMAIL_LOG_TAG_PATTERN);
  return match ? match[1] : null;
}

export function stripEmailLogTag(text: string) {
  return text.replace(EMAIL_LOG_TAG_PATTERN, "").trim();
}
