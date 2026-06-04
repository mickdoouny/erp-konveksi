"use client"



import { useCallback, useEffect, useRef, useState } from "react"

import { readStoredUser } from "@/lib/auth"
import { isClearChatIntent } from "@/lib/owner-ai-clear-chat-intent"



type ChatMessage = {

  id: string

  role: "user" | "assistant"

  content: string

  provider?: "openai" | "rule-based"

}



type AiMode = "ai" | "smart-query" | "loading"



const SUGGESTED_PROMPTS = [

  "Omset bulan ini?",

  "Berapa order Stelan?",

  "Performance CS 1?",

  "Order menunggu DP?",

  "Pipeline produksi?",

  "Breakdown jenis order?",

]



const WELCOME_MESSAGE: ChatMessage = {

  id: "welcome",

  role: "assistant",

  content:

    "Selamat datang di DPK AI Command Center. Tanyakan omset, performa CS, status order, pipeline produksi, atau laporan keuangan — saya jawab dari data ERP real-time.",

}



function newId() {

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

}



export function OwnerAiCommandCenter() {

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])

  const [input, setInput] = useState("")

  const [loading, setLoading] = useState(false)

  const [aiMode, setAiMode] = useState<AiMode>("loading")

  const [openAiModel, setOpenAiModel] = useState<string | null>(null)

  const [lastProvider, setLastProvider] = useState<"openai" | "rule-based" | null>(

    null

  )

  const scrollRef = useRef<HTMLDivElement>(null)



  const scrollToBottom = useCallback(() => {

    const el = scrollRef.current

    if (el) el.scrollTop = el.scrollHeight

  }, [])



  useEffect(() => {

    scrollToBottom()

  }, [messages, loading, scrollToBottom])



  useEffect(() => {

    const user = readStoredUser()

    if (!user) {

      setAiMode("smart-query")

      return

    }

    const params = new URLSearchParams({ user: JSON.stringify(user) })



    fetch(`/api/owner/ai-command?${params}`)

      .then((res) => res.json())

      .then((json) => {

        if (json.success && json.data) {

          setAiMode(json.data.mode === "ai" ? "ai" : "smart-query")

          setOpenAiModel(json.data.model ?? null)

        } else {

          setAiMode("smart-query")

        }

      })

      .catch(() => setAiMode("smart-query"))

  }, [])



  const clearChat = useCallback(() => {

    setMessages([WELCOME_MESSAGE])

    setLastProvider(null)

    setInput("")

  }, [])



  const modeLabel =

    lastProvider === "openai"

      ? `Mode AI${openAiModel ? ` (${openAiModel})` : ""}`

      : lastProvider === "rule-based"

        ? "Mode Smart Query (terbatas)"

        : aiMode === "ai"

          ? `Mode AI${openAiModel ? ` (${openAiModel})` : ""}`

          : aiMode === "smart-query"

            ? "Mode Smart Query (terbatas)"

            : null



  async function sendQuestion(question: string) {

    const trimmed = question.trim()

    if (!trimmed || loading) return



    if (isClearChatIntent(trimmed)) {

      clearChat()

      return

    }



    const user = readStoredUser()

    if (!user) return



    setMessages((prev) => [

      ...prev,

      { id: newId(), role: "user", content: trimmed },

    ])

    setInput("")

    setLoading(true)



    try {

      const res = await fetch("/api/owner/ai-command", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ question: trimmed, user }),

      })

      const json = await res.json()



      if (!res.ok || !json.success) {

        setMessages((prev) => [

          ...prev,

          {

            id: newId(),

            role: "assistant",

            content: json.message ?? "Gagal memproses pertanyaan.",

          },

        ])

        return

      }



      const provider = json.data?.meta?.provider as

        | "openai"

        | "rule-based"

        | undefined

      const openAiConfigured = json.data?.meta?.openAiConfigured as

        | boolean

        | undefined

      setLastProvider(provider ?? null)

      if (openAiConfigured !== undefined) {

        setAiMode(openAiConfigured ? "ai" : "smart-query")

      }

      if (json.data?.meta?.model) {

        setOpenAiModel(json.data.meta.model as string)

      }



      setMessages((prev) => [

        ...prev,

        {

          id: newId(),

          role: "assistant",

          content: json.data.answer as string,

          provider,

        },

      ])

    } catch {

      setMessages((prev) => [

        ...prev,

        {

          id: newId(),

          role: "assistant",

          content: "Tidak dapat terhubung ke server. Coba lagi.",

        },

      ])

    } finally {

      setLoading(false)

    }

  }



  function handleSubmit(e: React.FormEvent) {

    e.preventDefault()

    sendQuestion(input)

  }



  return (

    <section className="neo-card overflow-hidden border-orange-500/20">

      <div className="border-b border-zinc-800/80 bg-gradient-to-r from-orange-950/40 via-zinc-950/60 to-zinc-950/40 px-6 py-5">

        <div className="flex flex-wrap items-start justify-between gap-3">

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">

              AI Assistant

            </p>

            <h2 className="mt-1 text-xl font-bold text-white">

              DPK AI Command Center

            </h2>

            <p className="mt-1 text-sm text-zinc-500">

              Query omset, CS, keuangan, produksi — langsung dari data ERP.

            </p>

          </div>

          {modeLabel ? (

            <span

              className={`rounded-full border px-3 py-1 text-[11px] font-medium ${

                modeLabel.startsWith("Mode AI")

                  ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-300"

                  : "border-amber-500/40 bg-amber-950/50 text-amber-300"

              }`}

            >

              {modeLabel}

            </span>

          ) : null}

        </div>

        {aiMode === "smart-query" ? (

          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">

            Tambahkan{" "}

            <code className="text-amber-100">OPENAI_API_KEY</code> di{" "}

            <code className="text-amber-100">.env</code> untuk jawaban AI penuh

            (bahasa alami, semua metrik bisnis).

          </p>

        ) : null}

      </div>



      <div

        ref={scrollRef}

        className="flex max-h-[420px] min-h-[280px] flex-col gap-4 overflow-y-auto px-6 py-5"

      >

        {messages.map((msg) => (

          <div

            key={msg.id}

            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}

          >

            <div

              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${

                msg.role === "user"

                  ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white"

                  : "border border-zinc-800 bg-zinc-950/80 text-zinc-200"

              }`}

            >

              {msg.content}

            </div>

          </div>

        ))}

        {loading ? (

          <div className="flex justify-start">

            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-500">

              <span className="inline-flex gap-1">

                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:0ms]" />

                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:150ms]" />

                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:300ms]" />

              </span>

              Menganalisis data ERP…

            </div>

          </div>

        ) : null}

      </div>



      <div className="border-t border-zinc-800/80 px-6 py-4">

        <div className="mb-3 flex flex-wrap items-center gap-2">

          {SUGGESTED_PROMPTS.map((prompt) => (

            <button

              key={prompt}

              type="button"

              disabled={loading}

              onClick={() => sendQuestion(prompt)}

              className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-400 transition hover:border-orange-500/50 hover:text-orange-300 disabled:opacity-50"

            >

              {prompt}

            </button>

          ))}

          <button

            type="button"

            disabled={loading}

            onClick={clearChat}

            className="rounded-full border border-zinc-600 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-500 transition hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-50"

          >

            Kosongkan chat

          </button>

        </div>



        <form onSubmit={handleSubmit} className="flex gap-2">

          <input

            type="text"

            value={input}

            onChange={(e) => setInput(e.target.value)}

            placeholder="Tanya apa saja tentang bisnis…"

            disabled={loading}

            className="neo-input flex-1 text-sm"

          />

          <button

            type="submit"

            disabled={loading || !input.trim()}

            className="neo-btn-primary shrink-0 px-5 py-2 text-sm font-semibold disabled:opacity-50"

          >

            {loading ? "Memproses…" : "Kirim"}

          </button>

        </form>

      </div>

    </section>

  )

}


