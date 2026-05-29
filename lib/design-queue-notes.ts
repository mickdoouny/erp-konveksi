import type {
  DesignQueueMessage,
  DesignQueueNoteSenderRole,
} from "@prisma/client"

export type DesignQueueMessageRecord = {
  id: string
  designQueueItemId: string
  senderRole: DesignQueueNoteSenderRole
  senderName: string
  message: string
  createdAt: string
}

export const designQueueMessagesInclude = {
  DesignQueueMessage: {
    orderBy: { createdAt: "asc" as const },
  },
} as const

export function formatDesignQueueMessage(
  row: DesignQueueMessage
): DesignQueueMessageRecord {
  return {
    id: row.id,
    designQueueItemId: row.designQueueItemId,
    senderRole: row.senderRole,
    senderName: row.senderName,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }
}

export function formatDesignQueueMessages(
  rows: DesignQueueMessage[] | undefined | null
): DesignQueueMessageRecord[] {
  return (rows ?? []).map(formatDesignQueueMessage)
}

export function attachDesignQueueMessages<T extends Record<string, unknown>>(
  item: T & { DesignQueueMessage?: DesignQueueMessage[] }
): Omit<T, "DesignQueueMessage"> & { messages: DesignQueueMessageRecord[] } {
  const { DesignQueueMessage: rows, ...rest } = item
  return {
    ...rest,
    messages: formatDesignQueueMessages(rows),
  }
}

export function parseAddDesignQueueMessageBody(
  body: Record<string, unknown>
):
  | { ok: true; message: string; senderRole: DesignQueueNoteSenderRole; senderName: string }
  | { ok: false; message: string } {
  const text = String(body.message ?? "").trim()
  if (!text) {
    return { ok: false, message: "Pesan tidak boleh kosong" }
  }
  if (text.length > 4000) {
    return { ok: false, message: "Pesan terlalu panjang (maks. 4000 karakter)" }
  }

  const roleRaw = String(body.senderRole ?? "CS").toUpperCase()
  const senderRole: DesignQueueNoteSenderRole =
    roleRaw === "DESAINER" ? "DESAINER" : "CS"

  const senderName = String(body.senderName ?? "").trim()
  if (!senderName) {
    return { ok: false, message: "Nama pengirim wajib diisi" }
  }

  return { ok: true, message: text, senderRole, senderName }
}

export function labelDesignQueueMessageRole(
  role: DesignQueueNoteSenderRole
): string {
  return role === "CS" ? "CS" : "Desainer"
}

export function formatDesignQueueMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
