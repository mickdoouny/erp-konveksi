/** Whether OpenAI is configured for Owner AI Command Center. */
export function isOwnerOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function getOwnerOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
}
