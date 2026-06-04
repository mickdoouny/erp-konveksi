/** Normalize user input for clear-chat intent matching. */
export function normalizeClearChatInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+/g, "")
    .replace(/\s+/g, " ")
}

const CLEAR_CHAT_EXACT_PATTERNS: RegExp[] = [
  /^kosongkan\s+(chat|chating|chatting|percakapan|riwayat)(\s+ini)?$/,
  /^hapus\s+(chat|chating|chatting|percakapan|riwayat)(\s+ini)?$/,
  /^bersihkan\s+(chat|chating|chatting|percakapan|riwayat)(\s+ini)?$/,
  /^clear\s+chat$/,
  /^reset\s+(chat|chating|chatting|percakapan)?$/,
  /^reset$/,
  /^kosongkan$/,
]

const CLEAR_CHAT_CONTAINS_PATTERNS: RegExp[] = [
  /\bkosongkan\s+(chat|chating|chatting|percakapan)\b/,
  /\bhapus\s+(chat|chating|chatting|percakapan)\b/,
  /\bbersihkan\s+(chat|chating|chatting|percakapan)\b/,
  /\bclear\s+chat\b/,
  /\breset\s+chat\b/,
  /^kosongkan\s+chating$/,
  /^kosongkan\s+chatting$/,
]

export function isClearChatIntent(question: string): boolean {
  const text = normalizeClearChatInput(question)
  if (!text) return false

  if (CLEAR_CHAT_EXACT_PATTERNS.some((p) => p.test(text))) return true
  return CLEAR_CHAT_CONTAINS_PATTERNS.some((p) => p.test(text))
}

export const CLEAR_CHAT_ACK =
  "Percakapan dikosongkan. Silakan tanyakan hal baru tentang bisnis Anda."
