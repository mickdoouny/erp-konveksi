import { formatRupiahDisplay } from "@/lib/format-rupiah"
import {
  getOwnerOpenAiModel,
  isOwnerOpenAiConfigured,
} from "@/lib/owner-ai-config"
import {
  CLEAR_CHAT_ACK,
  isClearChatIntent,
} from "@/lib/owner-ai-clear-chat-intent"
import {
  loadOwnerAiContext,
  summarizeContextForLlm,
  type OwnerAiContext,
} from "@/lib/owner-ai-context"

export type OwnerAiResponseMeta = {
  provider: "openai" | "rule-based"
  model?: string
  openAiConfigured: boolean
}

function rupiah(n: number): string {
  return `Rp ${formatRupiahDisplay(n)}`
}

function normalizeQuestion(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[?!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bomzet\b/g, "omset")
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

function formatRecordCounts(record: Record<string, number>): string {
  const entries = Object.entries(record).filter(([, v]) => v > 0)
  if (entries.length === 0) return "Tidak ada data."
  return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n")
}

function answerOmset(context: OwnerAiContext, text: string): string | null {
  if (
    detectJenisOrderType(text) &&
    matchesAny(text, [/berapa/, /jumlah/, /banyak/, /total/])
  ) {
    return null
  }

  if (
    !matchesAny(text, [
      /omset/,
      /omzet/,
      /revenue/,
      /penjualan/,
      /total sales/,
    ])
  ) {
    return null
  }

  const { period, dashboard } = context
  const isThisMonth = matchesAny(text, [/bulan ini/, /this month/, /mtd/])

  if (isThisMonth) {
    return (
      `Omset ${period.monthLabel}: ${rupiah(period.monthOmzet)} ` +
      `(${period.monthOrderCount} order).\n\n` +
      `Total omzet keseluruhan: ${rupiah(dashboard.financial.totalOmzet)}.`
    )
  }

  return (
    `Total omzet keseluruhan: ${rupiah(dashboard.financial.totalOmzet)}.\n` +
    `Penjualan tervalidasi DP: ${rupiah(dashboard.kpis.salesTervalidasi)}.\n` +
    `Omset ${period.monthLabel}: ${rupiah(period.monthOmzet)} (${period.monthOrderCount} order).`
  )
}

function answerKeuangan(context: OwnerAiContext, text: string): string | null {
  if (
    !matchesAny(text, [
      /keuangan/,
      /laporan keuangan/,
      /dp/,
      /pelunasan/,
      /financial/,
    ])
  ) {
    return null
  }

  const f = context.dashboard.financial
  return (
    "Ringkasan keuangan:\n" +
    `- Total omzet: ${rupiah(f.totalOmzet)}\n` +
    `- DP diterima: ${rupiah(f.dpDiterima)}\n` +
    `- Sisa pelunasan: ${rupiah(f.sisaPelunasan)}\n` +
    `- Order menunggu DP: ${f.menungguDp}\n` +
    `- Order lunas: ${f.orderLunas}\n` +
    `- Antrian validasi keuangan: ${f.antrianKeuangan}` +
    (context.pendingDtfPayments > 0
      ? `\n- Pembayaran DTF menunggu: ${context.pendingDtfPayments}`
      : "")
  )
}

function answerCsPerformance(context: OwnerAiContext, text: string): string | null {
  if (
    !matchesAny(text, [
      /performance cs/,
      /performa cs/,
      /performa\s+cs/,
      /gimana\s+performa/,
      /bagaimana\s+performa/,
      /cs\s*\d/,
      /sales cs/,
      /penjualan cs/,
      /\bcs\s*\d/,
      /\bcs\d/,
    ])
  ) {
    return null
  }

  const csMatch = text.match(/cs\s*(\d+)/i)
  const rows = context.dashboard.salesByCs

  if (csMatch) {
    const target = `cs${csMatch[1]}`
    const found = rows.find(
      (r) => r.namaCs.toLowerCase().replace(/\s/g, "") === target
    )
    if (!found) {
      return `CS "${target}" tidak ditemukan dalam data penjualan. CS aktif: ${rows.map((r) => r.namaCs).join(", ") || "—"}.`
    }
    return (
      `Performa ${found.namaCs}:\n` +
      `- Total penjualan: ${rupiah(found.total)}\n` +
      `- Tervalidasi DP: ${rupiah(found.validated)}\n` +
      `- Jumlah order: ${found.count}`
    )
  }

  if (rows.length === 0) {
    return "Belum ada data performa CS."
  }

  const lines = rows
    .map(
      (r, i) =>
        `${i + 1}. ${r.namaCs} — ${rupiah(r.total)} (${r.count} order, tervalidasi ${rupiah(r.validated)})`
    )
    .join("\n")

  return `Performa CS (top ${rows.length}):\n${lines}`
}

function answerPendingDp(context: OwnerAiContext, text: string): string | null {
  if (
    !matchesAny(text, [
      /menunggu dp/,
      /pending dp/,
      /validasi dp/,
      /order.*dp/,
      /dp.*menunggu/,
      /belum dp/,
      /berapa.*dp/,
    ])
  ) {
    return null
  }

  const count = context.pendingDpValidation
  const f = context.dashboard.financial
  return (
    `Order menunggu validasi DP: ${count} order.\n` +
    `Antrian desain menunggu DP: ${context.dashboard.designQueue.menungguDp}.\n` +
    `Total nilai menunggu (modul keuangan): ${f.menungguDp} order perlu tindakan.`
  )
}

function answerProduksi(context: OwnerAiContext, text: string): string | null {
  if (
    !matchesAny(text, [
      /produksi/,
      /pipeline/,
      /antrian produksi/,
      /tahap produksi/,
      /stage/,
    ])
  ) {
    return null
  }

  const { productionPipeline } = context
  if (!context.workflowEnabled) {
    return "Pipeline produksi final order belum aktif (workflow legacy). Aktifkan USE_FINAL_ORDER_WORKFLOW=true."
  }

  if (productionPipeline.total === 0) {
    return "Belum ada order di pipeline produksi."
  }

  return (
    `Pipeline produksi (${productionPipeline.total} order aktif):\n` +
    formatRecordCounts(productionPipeline.byStage)
  )
}

function answerOrderStatus(context: OwnerAiContext, text: string): string | null {
  if (
    !matchesAny(text, [
      /status order/,
      /jumlah order/,
      /berapa order/,
      /order by status/,
      /order per status/,
    ])
  ) {
    return null
  }

  const payment = formatRecordCounts(context.orderCounts.byPaymentStatus)
  const status = context.workflowEnabled
    ? `\n\nBy status final order:\n${formatRecordCounts(context.orderCounts.byFinalOrderStatus)}`
    : ""

  return `Order by pembayaran:\n${payment}${status}`
}

function answerRecentOrders(context: OwnerAiContext, text: string): string | null {
  if (
    !matchesAny(text, [
      /order terbaru/,
      /recent order/,
      /order baru/,
      /list order/,
    ])
  ) {
    return null
  }

  const orders = context.recentOrders
  if (orders.length === 0) {
    return "Belum ada order final order terbaru."
  }

  const lines = orders
    .slice(0, 5)
    .map(
      (o) =>
        `- ${o.orderNumber} | ${o.namaCs} → ${o.namaKonsumen} | ${rupiah(o.totalHarga)} | ${o.paymentStatus ?? "—"} | ${o.productionStage ?? "—"}`
    )
    .join("\n")

  return `5 order terbaru:\n${lines}`
}

function answerDesain(context: OwnerAiContext, text: string): string | null {
  if (!matchesAny(text, [/antrian desain/, /desain cs/, /design queue/])) {
    return null
  }

  const d = context.dashboard.designQueue
  return (
    "Antrian desain CS:\n" +
    `- Aktif di desainer: ${d.aktif}\n` +
    `- Menunggu DP: ${d.menungguDp}\n` +
    `- Total antrian: ${d.total}`
  )
}

const JENIS_ORDER_LABELS = ["Atasan", "Stelan", "Celana"] as const

function detectJenisOrderType(text: string): (typeof JENIS_ORDER_LABELS)[number] | null {
  if (/\bstelan\b/.test(text)) return "Stelan"
  if (/\batasan\b/.test(text)) return "Atasan"
  if (/\bcelana\b/.test(text)) return "Celana"
  return null
}

function formatJenisOrderBreakdown(
  counts: Record<string, number>,
  label: string
): string {
  const lines = JENIS_ORDER_LABELS.map(
    (jenis) => `- ${jenis}: ${counts[jenis] ?? 0}`
  ).join("\n")
  const total = JENIS_ORDER_LABELS.reduce(
    (sum, jenis) => sum + (counts[jenis] ?? 0),
    0
  )
  return `${label} (${total} order):\n${lines}`
}

function answerJenisOrder(context: OwnerAiContext, text: string): string | null {
  const specific = detectJenisOrderType(text)
  const asksBreakdown = matchesAny(text, [
    /jenis\s*order/,
    /breakdown/,
    /order.*jenis/,
    /per\s*jenis/,
    /tipe\s*order/,
    /semua jenis/,
  ])
  const asksCount = matchesAny(text, [
    /berapa/,
    /jumlah/,
    /total/,
    /banyak/,
    /yang\s*masuk/,
    /\bmasuk\b/,
    /count/,
    /ada berapa/,
  ])
  const isThisMonth = matchesAny(text, [/bulan ini/, /this month/, /mtd/])

  const mentionsJenis =
    specific ||
    asksBreakdown ||
    matchesAny(text, [/\bstelan\b/, /\batasan\b/, /\bcelana\b/])

  if (!mentionsJenis) return null

  const { byJenisOrder, byJenisOrderDesignQueue } = context.orderCounts
  const orderSource = context.workflowEnabled ? "final order" : "lead order"

  if (specific && (asksCount || /\bmasuk\b/.test(text)) && !asksBreakdown) {
    const counts = isThisMonth
      ? context.period.monthByJenisOrder
      : byJenisOrder
    const count = counts[specific] ?? 0
    const queueCount = byJenisOrderDesignQueue[specific] ?? 0
    const periodLabel = isThisMonth ? context.period.monthLabel : "keseluruhan"
    return (
      `Order jenis ${specific} (${periodLabel}): ${count} (${orderSource}).\n` +
      `Antrian desain dengan jenis ${specific}: ${queueCount} item.`
    )
  }

  if (specific && !asksBreakdown) {
    const count = byJenisOrder[specific] ?? 0
    return `Order jenis ${specific}: ${count} (${orderSource}).`
  }

  if (!asksBreakdown && !asksCount) return null

  return (
    formatJenisOrderBreakdown(byJenisOrder, `Order by jenis (${orderSource})`) +
    "\n\n" +
    formatJenisOrderBreakdown(
      byJenisOrderDesignQueue,
      "Antrian desain by jenis"
    )
  )
}

function answerDefault(context: OwnerAiContext, text: string): string {
  if (matchesAny(text, [/stelan/, /atasan/, /celana/, /jenis\s*order/])) {
    return (
      "Maaf, belum bisa menjawab pertanyaan ini dengan tepat.\n\n" +
      "Coba pertanyaan seperti: \"Berapa banyak order Stelan?\", \"Breakdown jenis order?\", atau \"Berapa atasan yang masuk?\""
    )
  }

  return (
    "Maaf, belum bisa menjawab pertanyaan ini.\n\n" +
    "Contoh pertanyaan yang didukung:\n" +
    "- Omset bulan ini?\n" +
    "- Berapa order Stelan / Atasan / Celana?\n" +
    "- Breakdown jenis order?\n" +
    "- Performance CS 1?\n" +
    "- Order menunggu DP?\n" +
    "- Pipeline produksi?"
  )
}

function ruleBasedResponse(question: string, context: OwnerAiContext): string {
  const text = normalizeQuestion(question)

  const jenisAnswer = answerJenisOrder(context, text)
  if (jenisAnswer) return jenisAnswer

  const handlers = [
    answerPendingDp,
    answerOmset,
    answerKeuangan,
    answerCsPerformance,
    answerProduksi,
    answerOrderStatus,
    answerRecentOrders,
    answerDesain,
  ]

  for (const handler of handlers) {
    const answer = handler(context, text)
    if (answer) return answer
  }

  return answerDefault(context, text)
}

const OWNER_AI_SYSTEM_PROMPT = `Kamu adalah asisten bisnis ERP konveksi PT. DASA PUTRA KREATIF untuk Owner.

Aturan jawaban:
- Bahasa Indonesia, singkat, fokus pada pertanyaan (jangan ringkas seluruh dashboard kecuali diminta).
- Gunakan angka dari DATA KONTEKS JSON di bawah; jangan mengarang.
- Format rupiah: Rp X.XXX.XXX (titik sebagai pemisah ribuan).
- Jenis order: Atasan, Stelan, Celana — field orderByJenisOrder / orderJenisBulanIni.
- Performa CS: cocokkan cs1/cs2 ke nama di performaCs.
- Perintah kosongkan/hapus chat: jangan jawab di sini (ditangani aplikasi).
- Jika data tidak ada, katakan dengan jujur dan sarankan pertanyaan alternatif.

DATA KONTEKS:`

async function openAiResponse(
  question: string,
  context: OwnerAiContext
): Promise<{ text: string; model: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = getOwnerOpenAiModel()
  const systemPrompt =
    OWNER_AI_SYSTEM_PROMPT + "\n" + summarizeContextForLlm(context)

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  })

  if (!res.ok) {
    console.error("OpenAI error:", res.status, await res.text())
    return null
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = json.choices?.[0]?.message?.content?.trim()
  if (!text) return null

  return { text, model }
}

export async function generateOwnerAiResponse(question: string): Promise<{
  answer: string
  meta: OwnerAiResponseMeta
}> {
  const trimmed = question.trim()
  if (!trimmed) {
    return {
      answer: "Silakan tulis pertanyaan bisnis Anda.",
      meta: {
        provider: "rule-based",
        openAiConfigured: isOwnerOpenAiConfigured(),
      },
    }
  }

  if (isClearChatIntent(trimmed)) {
    return {
      answer: CLEAR_CHAT_ACK,
      meta: {
        provider: "rule-based",
        openAiConfigured: isOwnerOpenAiConfigured(),
      },
    }
  }

  const context = await loadOwnerAiContext()

  const llm = await openAiResponse(trimmed, context)
  if (llm) {
    return {
      answer: llm.text,
      meta: {
        provider: "openai",
        model: llm.model,
        openAiConfigured: true,
      },
    }
  }

  const fallbackNote = isOwnerOpenAiConfigured()
    ? "\n\n_(Mode Smart Query — respons AI tidak tersedia sementara.)_"
    : "\n\n_(Mode Smart Query — tambahkan OPENAI_API_KEY di .env untuk jawaban bahasa alami penuh.)_"

  return {
    answer: ruleBasedResponse(trimmed, context) + fallbackNote,
    meta: {
      provider: "rule-based",
      openAiConfigured: isOwnerOpenAiConfigured(),
    },
  }
}

export function getOwnerAiCapabilities() {
  return {
    openAiConfigured: isOwnerOpenAiConfigured(),
    model: isOwnerOpenAiConfigured() ? getOwnerOpenAiModel() : null,
  }
}
