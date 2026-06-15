"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser, type AuthUser } from "@/lib/auth"
import { homePathForUser } from "@/lib/auth-redirect"
import {
  DEPARTMENT_STAGES,
  PRODUKSI_PAGE_TITLES,
  resolveProduksiDepartment,
  STAGE_OPERATOR_ACTIONS,
  type OperatorStageAction,
  type ProduksiOperatorDepartment,
} from "@/lib/production-operator-stages"
import { labelProductionStatus } from "@/lib/status-labels"
import { DeadlineWarningBadge } from "@/components/production/deadline-warning-badge"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"
import { formatDateIdShort } from "@/lib/deadline-warning"
import {
  OperatorDesignFiles,
  type OperatorDesignFilesData,
} from "@/components/production/operator-design-files"
import { ProductionStatus } from "@prisma/client"
import {
  EMPTY_POTONG_BAHAN_FORM,
  potongBahanFormToPayload,
  validatePotongBahanForm,
  type PotongBahanWeightForm,
} from "@/lib/potong-bahan-weights"
import {
  EMPTY_PRINTING_INK_FORM,
  printingInkFormToPayload,
  validatePrintingInkForm,
  type PrintingInkForm,
} from "@/lib/printing-ink-consumption"
import { formatReworkParts } from "@/lib/rework-garment-parts"
import {
  isReworkEligibleStage,
  parseAffectedParts,
  type ReworkRequestTypeCode,
} from "@/lib/rework-request"
import { ReworkRequestModal } from "@/components/production/rework-request-modal"
import { SettingResultUpload } from "@/components/production/setting-result-upload"
import { parseDesignFiles } from "@/lib/cs-antrian-desain"

type QueueRow = {
  id: string
  orderNumber: string
  namaKonsumen: string
  namaArtikel: string
  jenisOrder?: string | null
  qty: number
  deadline?: string | null
  jenisProduksi?: string
  expressPriority?: number | null
  fileDesainFinal?: string | null
  needsDTF?: boolean
  needsProving?: boolean
  DesignQueueItem?: OperatorDesignFilesData["DesignQueueItem"]
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
    settingResultFiles?: string | null
    settingSubmittedAt?: string | null
    settingAccAt?: string | null
    settingRejectNote?: string | null
    settingSentToConsumerAt?: string | null
    settingSubmitCount?: number | null
    ProductionStagePlan?: {
      stage: string
      status: string
    }[]
  }
  pendingReworkRequest?: {
    id: string
    requestedFromStage: string
    reason: string
    affectedParts: unknown
    createdAt: string
  } | null
  approvedReworkRequest?: {
    id: string
    affectedParts: unknown
    approvedAt: string
  } | null
}

type ProduksiDepartment = ProduksiOperatorDepartment

function canAccessDepartment(
  user: AuthUser,
  department: ProduksiDepartment
): boolean {
  if (user.role === "owner") return true
  if (user.role !== "produksi") return false
  return resolveProduksiDepartment(user) === department
}

function stageActions(status: string): OperatorStageAction | null {
  return STAGE_OPERATOR_ACTIONS[status as ProductionStatus] ?? null
}

function isInProgress(row: QueueRow): boolean {
  const status = row.ProductionPipeline.currentStatus
  const plan = row.ProductionPipeline.ProductionStagePlan?.find(
    (p) => p.stage === status
  )
  return plan?.status === "IN_PROGRESS"
}

function PrintingInkFormFields({
  form,
  onChange,
}: {
  form: PrintingInkForm
  onChange: (field: keyof PrintingInkForm, value: string) => void
}) {
  const fields: { key: keyof PrintingInkForm; label: string }[] = [
    { key: "konsumsiTintaC", label: "C" },
    { key: "konsumsiTintaM", label: "M" },
    { key: "konsumsiTintaY", label: "Y" },
    { key: "konsumsiTintaK", label: "K" },
  ]

  return (
    <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-300/90">
        Input konsumsi tinta (printing)
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Isi konsumsi aktual per warna sebelum menyelesaikan printing. Satuan: ml.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ key, label }) => (
          <label key={key} className="block text-sm">
            <span className="text-zinc-400">
              Konsumsi tinta {label} (ml){" "}
              <span className="text-sky-400">*</span>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="neo-input mt-1 w-full"
              placeholder="cth. 12.5"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function PotongBahanWeightFormFields({
  form,
  onChange,
}: {
  form: PotongBahanWeightForm
  onChange: (field: keyof PotongBahanWeightForm, value: string) => void
}) {
  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">
        Input berat bahan (potong bahan)
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Isi berat aktual yang dipakai sebelum menyelesaikan tahap ini. Satuan: kg.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-400">
            Berat bahan utama (kg) <span className="text-amber-400">*</span>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="neo-input mt-1 w-full"
            placeholder="cth. 12.5"
            value={form.beratBahan}
            onChange={(e) => onChange("beratBahan", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Berat rib (kg)</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Termasuk kerah</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="neo-input mt-1 w-full"
            placeholder="opsional"
            value={form.beratRib}
            onChange={(e) => onChange("beratRib", e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-zinc-400">Catatan aksesoris lain</span>
          <input
            type="text"
            className="neo-input mt-1 w-full"
            placeholder="opsional — mis. manset, kantong, dll."
            value={form.catatanPotongBahan}
            onChange={(e) => onChange("catatanPotongBahan", e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function WorkstationSubSteps({
  stages,
  currentStatus,
  stagePlans,
}: {
  stages: ProductionStatus[]
  currentStatus: string
  stagePlans?: { stage: string; status: string }[]
}) {
  if (stages.length <= 1) return null

  const currentIdx = stages.indexOf(currentStatus as ProductionStatus)

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {stages.map((stage, index) => {
        const plan = stagePlans?.find((entry) => entry.stage === stage)
        const isCurrent = stage === currentStatus
        const isDone =
          (currentIdx >= 0 && index < currentIdx) ||
          plan?.status === "COMPLETED"
        const isActive = isCurrent && !isDone

        let chipClass =
          "rounded-full border px-2.5 py-0.5 text-[11px] font-medium "
        if (isDone) {
          chipClass +=
            "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
        } else if (isActive) {
          chipClass += "border-amber-500/40 bg-amber-950/40 text-amber-300"
        } else {
          chipClass += "border-zinc-700 bg-zinc-900/60 text-zinc-500"
        }

        return (
          <span key={stage} className={chipClass}>
            {index + 1}. {labelProductionStatus(stage)}
          </span>
        )
      })}
    </div>
  )
}

export function OperatorQueuePage({
  department,
  showDesignFiles = false,
}: {
  department: ProduksiDepartment
  /** Tampilkan file CDR/DTF/mockup dari desainer (halaman Setting). */
  showDesignFiles?: boolean
}) {
  const router = useRouter()
  const meta = PRODUKSI_PAGE_TITLES[department]
  const workstationStages = DEPARTMENT_STAGES[department]
  const [items, setItems] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [weightForms, setWeightForms] = useState<
    Record<string, PotongBahanWeightForm>
  >({})
  const [inkForms, setInkForms] = useState<Record<string, PrintingInkForm>>({})
  const [reworkModal, setReworkModal] = useState<{
    pipelineId: string
    orderNumber: string
    jenisOrder?: string | null
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/production-pipeline/queue?department=${department}`,
        { cache: "no-store" }
      )
      const json = await res.json()
      setItems(json.success ? json.data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => {
    const stored = readStoredUser()
    if (!stored) {
      router.replace("/login")
      return
    }
    if (stored.role !== "produksi" && stored.role !== "owner") {
      router.push(homePathForUser(stored))
      return
    }
    if (!canAccessDepartment(stored, department)) {
      router.push(homePathForUser(stored))
      return
    }
    queueMicrotask(() => {
      void load()
    })
  }, [router, load, department])

  function weightFormFor(pipelineId: string): PotongBahanWeightForm {
    return weightForms[pipelineId] ?? EMPTY_POTONG_BAHAN_FORM
  }

  function updateWeightForm(
    pipelineId: string,
    field: keyof PotongBahanWeightForm,
    value: string
  ) {
    setWeightForms((prev) => ({
      ...prev,
      [pipelineId]: {
        ...weightFormFor(pipelineId),
        [field]: value,
      },
    }))
  }

  function inkFormFor(pipelineId: string): PrintingInkForm {
    return inkForms[pipelineId] ?? EMPTY_PRINTING_INK_FORM
  }

  function updateInkForm(
    pipelineId: string,
    field: keyof PrintingInkForm,
    value: string
  ) {
    setInkForms((prev) => ({
      ...prev,
      [pipelineId]: {
        ...inkFormFor(pipelineId),
        [field]: value,
      },
    }))
  }

  async function submitReworkRequest(
    pipelineId: string,
    payload: {
      reason: string
      requestType?: ReworkRequestTypeCode
      affectedParts: string[]
    }
  ) {
    const user = readStoredUser()
    if (!user) return

    const res = await fetch("/api/rework-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productionPipelineId: pipelineId,
        requestedByUserId: user.id,
        requestedByName: user.nama,
        reason: payload.reason,
        requestType: payload.requestType,
        affectedParts: payload.affectedParts,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.message ?? "Gagal mengajukan request")
      throw new Error(json.message)
    }
    await load()
  }

  async function patchPipeline(
    pipelineId: string,
    action: "start_stage" | "complete_stage",
    currentStatus?: string
  ) {
    const user = readStoredUser()
    if (!user) return

    let materialWeights: ReturnType<typeof potongBahanFormToPayload> | undefined
    let inkConsumption: ReturnType<typeof printingInkFormToPayload> | undefined
    if (
      action === "complete_stage" &&
      currentStatus === ProductionStatus.PREPARE_BAHAN_KAIN
    ) {
      const form = weightFormFor(pipelineId)
      const validationError = validatePotongBahanForm(form)
      if (validationError) {
        alert(validationError)
        return
      }
      materialWeights = potongBahanFormToPayload(form)
    }
    if (
      action === "complete_stage" &&
      currentStatus === ProductionStatus.PRINTING
    ) {
      const form = inkFormFor(pipelineId)
      const validationError = validatePrintingInkForm(form)
      if (validationError) {
        alert(validationError)
        return
      }
      inkConsumption = printingInkFormToPayload(form)
    }
    if (
      action === "complete_stage" &&
      currentStatus === ProductionStatus.SETTING
    ) {
      const row = items.find((entry) => entry.ProductionPipeline.id === pipelineId)
      const settingFiles = parseDesignFiles(
        row?.ProductionPipeline.settingResultFiles
      )
      if (!settingFiles.length) {
        alert("Unggah minimal satu foto hasil setting sebelum kirim ke CS")
        return
      }
    }

    setBusyId(pipelineId)
    try {
      const res = await fetch(`/api/production-pipeline/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName: user.nama,
          actorRole: user.role,
          actorId: user.id,
          ...(materialWeights ? { materialWeights } : {}),
          ...(inkConsumption ? { inkConsumption } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal")
        return
      }
      if (action === "complete_stage") {
        setWeightForms((prev) => {
          const next = { ...prev }
          delete next[pipelineId]
          return next
        })
        setInkForms((prev) => {
          const next = { ...prev }
          delete next[pipelineId]
          return next
        })
      }
      await load()
    } catch {
      alert("Gagal memperbarui pipeline")
    } finally {
      setBusyId("")
    }
  }

  return (
    <AppShell>
      <PageHeader
        badge="Produksi"
        title={meta.title}
        description={meta.description}
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Antrian kosong — tidak ada order di tahap ini.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => {
            const pipeline = row.ProductionPipeline
            const pid = pipeline.id
            const currentStatus = pipeline.currentStatus
            const actions = stageActions(currentStatus)
            const inProgress = isInProgress(row)
            const busy = busyId === pid

            return (
              <div key={row.id} className="neo-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Order
                    </p>
                    <p className="font-medium text-orange-400">{row.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {pipeline.productionNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DeadlineWarningBadge deadline={row.deadline} />
                    <JenisProduksiBadge
                      jenisProduksi={row.jenisProduksi}
                      expressPriority={row.expressPriority}
                    />
                    <span className="rounded-full border border-sky-500/40 bg-sky-950/40 px-2.5 py-0.5 text-xs font-semibold text-sky-200">
                      {labelProductionStatus(currentStatus)}
                    </span>
                    {inProgress ? (
                      <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        Sedang diproses
                      </span>
                    ) : null}
                    {row.pendingReworkRequest ? (
                      <span className="rounded-full border border-violet-500/40 bg-violet-950/40 px-2.5 py-0.5 text-xs font-semibold text-violet-200">
                        Menunggu keputusan admin
                      </span>
                    ) : null}
                    {department === "PREPRESS" &&
                    row.approvedReworkRequest &&
                    parseAffectedParts(row.approvedReworkRequest.affectedParts)
                      .length > 0 ? (
                      <span className="rounded-full border border-rose-500/40 bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-200">
                        Print ulang:{" "}
                        {formatReworkParts(
                          parseAffectedParts(
                            row.approvedReworkRequest.affectedParts
                          )
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold text-white">{row.namaKonsumen}</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {row.namaArtikel}
                      <span className="text-zinc-500"> · </span>
                      {row.qty} pcs
                    </p>
                    {row.deadline ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Deadline: {formatDateIdShort(row.deadline)}
                      </p>
                    ) : null}
                    {row.needsProving && department === "PREPRESS" ? (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-sm text-amber-200">
                        <p className="font-semibold text-amber-100">
                          Perlu proving
                        </p>
                        <p className="mt-1 text-xs text-amber-200/90">
                          Perhatikan saat setting — order ini memerlukan proving.
                        </p>
                      </div>
                    ) : null}
                    {department === "PREPRESS" &&
                    row.approvedReworkRequest &&
                    parseAffectedParts(row.approvedReworkRequest.affectedParts)
                      .length > 0 ? (
                      <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">
                        <span className="font-semibold text-rose-300">
                          Print ulang:{" "}
                        </span>
                        {formatReworkParts(
                          parseAffectedParts(
                            row.approvedReworkRequest.affectedParts
                          )
                        )}
                      </p>
                    ) : null}
                    <WorkstationSubSteps
                      stages={workstationStages}
                      currentStatus={currentStatus}
                      stagePlans={pipeline.ProductionStagePlan}
                    />
                    {inProgress &&
                    currentStatus === ProductionStatus.PREPARE_BAHAN_KAIN ? (
                      <PotongBahanWeightFormFields
                        form={weightFormFor(pid)}
                        onChange={(field, value) =>
                          updateWeightForm(pid, field, value)
                        }
                      />
                    ) : null}
                    {inProgress &&
                    currentStatus === ProductionStatus.PRINTING ? (
                      <PrintingInkFormFields
                        form={inkFormFor(pid)}
                        onChange={(field, value) =>
                          updateInkForm(pid, field, value)
                        }
                      />
                    ) : null}
                    {department === "PREPRESS" &&
                    inProgress &&
                    currentStatus === ProductionStatus.SETTING ? (
                      <SettingResultUpload
                        pipelineId={pid}
                        settingResultFiles={pipeline.settingResultFiles}
                        onUpdated={(serialized) => {
                          setItems((prev) =>
                            prev.map((entry) =>
                              entry.id === row.id
                                ? {
                                    ...entry,
                                    ProductionPipeline: {
                                      ...entry.ProductionPipeline,
                                      settingResultFiles: serialized,
                                    },
                                  }
                                : entry
                            )
                          )
                        }}
                      />
                    ) : null}
                    {department === "PREPRESS" &&
                    pipeline.settingAccAt &&
                    currentStatus !== ProductionStatus.SETTING &&
                    currentStatus !== ProductionStatus.MENUNGGU_ACC_SETTING ? (
                      <SettingResultUpload
                        pipelineId={pid}
                        settingResultFiles={pipeline.settingResultFiles}
                        locked
                        onUpdated={() => {}}
                      />
                    ) : null}
                    {currentStatus === ProductionStatus.MENUNGGU_ACC_SETTING ? (
                      <>
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-sm text-amber-200">
                          <p className="font-semibold text-amber-100">
                            Menunggu ACC konsumen via CS
                          </p>
                          <p className="mt-1 text-xs text-amber-200/90">
                            Proses berlanjut otomatis ke layout setelah CS
                            mendapat persetujuan konsumen. Order tetap di antrian
                            ini tanpa batas waktu.
                            {pipeline.settingSentToConsumerAt
                              ? " CS sudah mengirim foto ke konsumen — menunggu jawaban."
                              : " CS sedang menyiapkan konfirmasi ke konsumen."}
                            {(pipeline.settingSubmitCount ?? 0) > 1
                              ? ` (pengiriman ke-${pipeline.settingSubmitCount})`
                              : ""}
                          </p>
                        </div>
                        <SettingResultUpload
                          pipelineId={pid}
                          settingResultFiles={pipeline.settingResultFiles}
                          disabled
                          onUpdated={() => {}}
                        />
                      </>
                    ) : null}
                    {pipeline.settingRejectNote ? (
                      <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">
                        <span className="font-semibold text-rose-300">
                          Revisi setting:{" "}
                        </span>
                        {pipeline.settingRejectNote}
                      </div>
                    ) : null}
                    {showDesignFiles ? (
                      <OperatorDesignFiles
                        data={{
                          fileDesainFinal: row.fileDesainFinal,
                          needsDTF: row.needsDTF,
                          DesignQueueItem: row.DesignQueueItem,
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {actions ? (
                      <>
                        {!inProgress ? (
                          <BtnPrimary
                            disabled={busy || Boolean(row.pendingReworkRequest)}
                            onClick={() => patchPipeline(pid, "start_stage")}
                          >
                            {actions.startLabel}
                          </BtnPrimary>
                        ) : (
                          <BtnApprove
                            disabled={
                              busy ||
                              Boolean(row.pendingReworkRequest) ||
                              (currentStatus === ProductionStatus.SETTING &&
                                !parseDesignFiles(pipeline.settingResultFiles)
                                  .length)
                            }
                            onClick={() =>
                              patchPipeline(pid, "complete_stage", currentStatus)
                            }
                          >
                            {actions.completeLabel}
                          </BtnApprove>
                        )}
                        {inProgress ? (
                          <BtnGhost disabled={busy} onClick={() => void load()}>
                            Refresh
                          </BtnGhost>
                        ) : null}
                      </>
                    ) : null}
                    {isReworkEligibleStage(
                      currentStatus as ProductionStatus
                    ) && !row.pendingReworkRequest ? (
                      <BtnGhost
                        disabled={busy}
                        onClick={() =>
                          setReworkModal({
                            pipelineId: pid,
                            orderNumber: row.orderNumber,
                            jenisOrder: row.jenisOrder,
                          })
                        }
                      >
                        Ajukan ke Admin
                      </BtnGhost>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ReworkRequestModal
        open={reworkModal !== null}
        orderNumber={reworkModal?.orderNumber ?? ""}
        jenisOrder={reworkModal?.jenisOrder}
        onClose={() => setReworkModal(null)}
        onSubmit={async (payload) => {
          if (!reworkModal) return
          await submitReworkRequest(reworkModal.pipelineId, payload)
        }}
      />
    </AppShell>
  )
}
