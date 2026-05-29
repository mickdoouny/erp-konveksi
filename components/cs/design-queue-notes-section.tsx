"use client"

import { useState } from "react"
import { BtnPrimary } from "@/components/ui/buttons"
import {
  formatDesignQueueMessageTime,
  labelDesignQueueMessageRole,
  type DesignQueueMessageRecord,
} from "@/lib/design-queue-notes"
import type { DesignQueueNoteSenderRole } from "@prisma/client"

type DesignQueueNotesSectionProps = {
  itemId: string
  messages: DesignQueueMessageRecord[]
  senderRole: DesignQueueNoteSenderRole
  senderName: string
  onMessagesUpdated: (messages: DesignQueueMessageRecord[]) => void
}

export function DesignQueueNotesSection({
  itemId,
  messages,
  senderRole,
  senderName,
  onMessagesUpdated,
}: DesignQueueNotesSectionProps) {
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/design-queue/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          senderRole,
          senderName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Gagal mengirim pesan"
        )
        return
      }
      if (Array.isArray(data.messages)) {
        onMessagesUpdated(data.messages)
      }
      setDraft("")
    } catch {
      setError("Terjadi kesalahan jaringan")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="neo-card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Pesan CS ↔ Desainer</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Koordinasi singkat untuk item ini. Desainer dan CS melihat thread yang sama.
        </p>
      </div>

      <div
        className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Belum ada pesan. Kirim catatan pertama ke desainer.
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderRole === senderRole
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl border px-3 py-2 sm:max-w-[70%] ${
                    isOwn
                      ? "border-orange-500/35 bg-orange-950/25"
                      : "border-zinc-700 bg-zinc-900/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={`text-xs font-semibold ${
                        isOwn ? "text-orange-300" : "text-zinc-300"
                      }`}
                    >
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                      {labelDesignQueueMessageRole(msg.senderRole)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
                    {msg.message}
                  </p>
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    {formatDesignQueueMessageTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm text-zinc-400" htmlFor="design-queue-note">
          Pesan baru ({labelDesignQueueMessageRole(senderRole)})
        </label>
        <textarea
          id="design-queue-note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            senderRole === "CS"
              ? "Tulis instruksi atau pertanyaan untuk desainer…"
              : "Tulis balasan atau catatan untuk CS…"
          }
          rows={3}
          disabled={sending}
          className="neo-input min-h-[88px] w-full"
        />
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <BtnPrimary type="submit" disabled={sending || !draft.trim()}>
            {sending ? "Mengirim…" : "Kirim pesan"}
          </BtnPrimary>
        </div>
      </form>
    </div>
  )
}
