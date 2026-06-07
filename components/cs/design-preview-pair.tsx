"use client"

import { useEffect, useRef, useState } from "react"
import {
  filesFromDataTransfer,
  isDesignImageFile,
  isDesignImageUrl,
  mergeDesignFiles,
  parseDesignFiles,
  type DesignFile,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import { openImageInNewTab } from "@/lib/image-viewer"

export type DesignPreviewDropzoneProps = {
  onFiles: (files: FileList) => void
  uploading?: boolean
  accept?: string
  onRemoveFile?: (file: DesignFile) => void
  removingUrl?: string | null
  onFeedback?: (message: string, kind: "error" | "info") => void
  /** Dipanggil sebelum dialog file dibuka — cegah refresh focus yang memutus onChange. */
  onOpenFilePicker?: () => void
}

type DesignPreviewPairProps = {
  item: Pick<
    DesignQueueItemRecord,
    "desainUtama" | "logoSponsor" | "hasilDesain" | "materiDesain"
  >
  hasilDropzone?: DesignPreviewDropzoneProps
  hasilUploadBlockedReason?: string
}

function isImageUrl(url: string): boolean {
  return isDesignImageUrl(url)
}

function isDragEventInside(
  event: React.DragEvent,
  element: EventTarget & Element
): boolean {
  const related = event.relatedTarget as Node | null
  return Boolean(related && element.contains(related))
}

function PreviewPane({
  title,
  files,
  emptyLabel,
  dropzone,
  uploadBlockedReason,
}: {
  title: string
  files: DesignFile[]
  emptyLabel: string
  dropzone?: DesignPreviewDropzoneProps
  uploadBlockedReason?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dropFeedback, setDropFeedback] = useState<{
    message: string
    kind: "error" | "info"
  } | null>(null)
  const imageFiles = files.filter((f) => isImageUrl(f.url))
  const otherFiles = files.filter((f) => !isImageUrl(f.url))
  const accept = dropzone?.accept ?? "image/*"
  const uploading = dropzone?.uploading ?? false
  const removingUrl = dropzone?.removingUrl ?? null
  const dropzoneEnabled = Boolean(dropzone) && !uploading && !removingUrl
  const uploadBlocked = Boolean(uploadBlockedReason) && !dropzone
  const displayEmptyLabel = dropzoneEnabled
    ? "Seret gambar ke sini"
    : emptyLabel

  function showDropFeedback(message: string, kind: "error" | "info" = "error") {
    setDropFeedback({ message, kind })
    dropzone?.onFeedback?.(message, kind)
  }

  function requestRemoveFile(file: DesignFile) {
    if (!dropzone?.onRemoveFile || uploading || removingUrl) return
    if (!confirm(`Hapus "${file.name}" dari hasil desain?`)) return
    dropzone.onRemoveFile(file)
  }

  function submitFiles(fileList: FileList | File[] | null | undefined) {
    if (!dropzone) return
    if (uploading || removingUrl) {
      showDropFeedback(
        uploading
          ? "Tunggu unggahan selesai sebelum menambah file lagi."
          : "Tunggu penghapusan selesai sebelum menambah file lagi.",
        "info"
      )
      return
    }
    const fileArray = fileList
      ? Array.isArray(fileList)
        ? fileList
        : Array.from(fileList)
      : []
    if (!fileArray.length) {
      showDropFeedback(
        "Tidak ada file terdeteksi setelah memilih dari galeri. Coba file lain atau format PNG/JPG.",
        "error"
      )
      return
    }
    const transfer = new DataTransfer()
    for (const file of fileArray) {
      if (isDesignImageFile(file)) transfer.items.add(file)
    }
    if (!transfer.files.length) {
      showDropFeedback(
        "Hanya file gambar yang didukung (PNG, JPG, GIF, WebP, HEIC, dll.)",
        "error"
      )
      return
    }
    setDropFeedback(null)
    dropzone.onFiles(transfer.files)
  }

  function openFilePicker() {
    if (!dropzoneEnabled) return
    dropzone?.onOpenFilePicker?.()
    fileInputRef.current?.click()
  }

  function handleFileInputChange(fileList: FileList | null) {
    const snapshot = fileList?.length ? Array.from(fileList) : []
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    submitFiles(snapshot)
  }

  useEffect(() => {
    if (!dropzoneEnabled) return

    function preventWindowDropCancel(event: DragEvent) {
      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener("dragenter", preventWindowDropCancel)
    window.addEventListener("dragover", preventWindowDropCancel)

    return () => {
      window.removeEventListener("dragenter", preventWindowDropCancel)
      window.removeEventListener("dragover", preventWindowDropCancel)
    }
  }, [dropzoneEnabled])

  const dragHandlers = dropzone
    ? {
        onDragEnter(event: React.DragEvent) {
          event.preventDefault()
          event.stopPropagation()
          if (uploading || removingUrl) return
          setIsDragging(true)
        },
        onDragOver(event: React.DragEvent) {
          event.preventDefault()
          event.stopPropagation()
          if (uploading || removingUrl) return
          event.dataTransfer.dropEffect = "copy"
          setIsDragging(true)
        },
        onDragLeave(event: React.DragEvent) {
          event.preventDefault()
          event.stopPropagation()
          if (isDragEventInside(event, event.currentTarget)) return
          setIsDragging(false)
        },
        onDragEnd() {
          setIsDragging(false)
        },
        onDrop(event: React.DragEvent) {
          event.preventDefault()
          event.stopPropagation()
          setIsDragging(false)
          submitFiles(filesFromDataTransfer(event.dataTransfer))
        },
      }
    : undefined

  const dropzoneSurfaceClass = dropzone
    ? isDragging
      ? "border-orange-500/70 bg-orange-500/10 ring-1 ring-orange-500/30"
      : "border-zinc-700 bg-zinc-950/30 hover:border-zinc-600"
    : uploadBlocked
      ? "border-zinc-800 bg-zinc-950/20"
      : "border-zinc-700"

  function renderFilePickerSurface(
    className: string,
    children: React.ReactNode
  ) {
    if (!dropzoneEnabled) {
      return (
        <div className={className} title={uploadBlockedReason}>
          {children}
        </div>
      )
    }

    return (
      <div
        role="button"
        tabIndex={0}
        className={`relative block cursor-pointer ${className}`}
        {...dragHandlers}
        onClick={(event) => {
          event.preventDefault()
          if (uploading) return
          openFilePicker()
        }}
        onKeyDown={(event) => {
          if (uploading) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openFilePicker()
          }
        }}
      >
        {children}
      </div>
    )
  }

  const content = (
    <>
      {files.length === 0 ? (
        dropzoneEnabled ? (
          renderFilePickerSurface(
            `flex min-h-[220px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center text-sm transition ${dropzoneSurfaceClass} ${uploading ? "pointer-events-none opacity-70" : ""}`,
            <>
            <p
              className={`text-base font-semibold ${isDragging ? "text-orange-300" : "text-zinc-300"}`}
            >
              {uploading
                ? "Mengunggah…"
                : isDragging
                  ? "Lepaskan untuk mengunggah"
                  : displayEmptyLabel}
            </p>
            {!uploading && !isDragging ? (
              <>
                <p className="text-sm text-zinc-500">
                  Klik area ini atau gunakan tombol Pilih file di bawah
                </p>
                <p className="rounded-lg bg-orange-950/40 px-3 py-1.5 text-xs text-orange-300/90">
                  Dropzone aktif — unggah diizinkan
                </p>
              </>
            ) : null}
            </>
          )
        ) : (
          <div
            className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm transition ${dropzoneSurfaceClass}`}
            title={uploadBlockedReason}
          >
            <p className="text-zinc-500">{displayEmptyLabel}</p>
            {uploadBlocked ? (
              <p className="max-w-xs text-xs text-amber-400/90">
                {uploadBlockedReason}
              </p>
            ) : null}
          </div>
        )
      ) : (
        <>
          {imageFiles.length > 0 ? (
            <div
              className={`grid gap-3 sm:grid-cols-2 ${isDragging ? "pointer-events-none" : ""}`}
            >
              {imageFiles.map((file, index) => (
                <div
                  key={`${file.url}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60"
                >
                  <button
                    type="button"
                    onClick={() => openImageInNewTab(file.url, file.name)}
                    className="block w-full text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.name}
                      className="aspect-square w-full cursor-pointer object-contain transition group-hover:opacity-90"
                    />
                    <p className="truncate px-2 py-1.5 text-xs text-zinc-400">
                      {file.name}
                    </p>
                  </button>
                  {dropzone?.onRemoveFile ? (
                    <button
                      type="button"
                      disabled={removingUrl === file.url || uploading}
                      onClick={() => requestRemoveFile(file)}
                      className="absolute right-2 top-2 z-30 rounded-lg border border-red-500/40 bg-red-950/85 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-900/80 disabled:opacity-50"
                    >
                      {removingUrl === file.url ? "Menghapus…" : "Hapus"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {otherFiles.length > 0 ? (
            <ul
              className={`space-y-2 ${isDragging ? "pointer-events-none" : ""}`}
            >
              {otherFiles.map((file, index) => (
                <li
                  key={`${file.url}-${index}`}
                  className="flex items-center gap-2"
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm font-medium text-orange-400 hover:text-orange-300"
                  >
                    {file.name}
                  </a>
                  {dropzone?.onRemoveFile ? (
                    <button
                      type="button"
                      disabled={removingUrl === file.url || uploading}
                      onClick={() => requestRemoveFile(file)}
                      className="shrink-0 rounded-lg border border-red-500/40 bg-red-950/50 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                    >
                      {removingUrl === file.url ? "…" : "Hapus"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {dropzone ? (
            dropzoneEnabled ? (
              renderFilePickerSurface(
                `rounded-xl border border-dashed px-4 py-3 text-center text-xs transition ${dropzoneSurfaceClass} ${uploading ? "pointer-events-none opacity-70" : ""}`,
                <p className={isDragging ? "text-orange-300" : "text-zinc-500"}>
                  {uploading
                    ? "Mengunggah…"
                    : isDragging
                      ? "Lepaskan untuk mengganti hasil desain"
                      : "Seret gambar ke kolom ini atau klik untuk mengunggah ulang"}
                </p>
              )
            ) : (
              <div
                className={`rounded-xl border border-dashed px-4 py-3 text-center text-xs transition ${dropzoneSurfaceClass} ${uploading ? "pointer-events-none opacity-70" : ""}`}
              >
                <p className="text-zinc-500">
                  {uploading ? "Mengunggah…" : "Menunggu…"}
                </p>
              </div>
            )
          ) : uploadBlocked ? (
            <div
              className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 px-4 py-3 text-center text-xs"
              title={uploadBlockedReason}
            >
              <p className="text-amber-400/90">{uploadBlockedReason}</p>
            </div>
          ) : null}
        </>
      )}
    </>
  )

  return (
    <div
      className={`flex min-h-[320px] flex-col rounded-2xl border bg-zinc-900/50 transition ${
        dropzone && isDragging
          ? "border-orange-500/70 ring-2 ring-orange-500/30"
          : "border-zinc-800"
      }`}
      {...dragHandlers}
    >
      <div className="border-b border-zinc-800 px-4 py-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-400/90">
            {title}
          </h3>
          {dropzoneEnabled ? (
            <span className="rounded-full border border-emerald-500/35 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              Dropzone aktif
            </span>
          ) : null}
        </div>
      </div>

      {dropFeedback ? (
        <p
          role="alert"
          className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs ${
            dropFeedback.kind === "error"
              ? "border-red-500/40 bg-red-950/30 text-red-200"
              : "border-amber-500/35 bg-amber-950/25 text-amber-200"
          }`}
        >
          {dropFeedback.message}
        </p>
      ) : null}

      <div className="relative flex flex-1 flex-col gap-3 p-4">
        {dropzoneEnabled ? (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            disabled={uploading}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => handleFileInputChange(event.target.files)}
          />
        ) : null}
        {dropzone && isDragging ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-orange-500/70 bg-orange-500/10"
          >
            <p className="text-sm font-medium text-orange-300">
              {files.length > 0
                ? "Lepaskan untuk mengganti hasil desain"
                : "Lepaskan untuk mengunggah"}
            </p>
          </div>
        ) : null}
        {content}
      </div>
    </div>
  )
}

export default function DesignPreviewPair({
  item,
  hasilDropzone,
  hasilUploadBlockedReason,
}: DesignPreviewPairProps) {
  const desainAwal = mergeDesignFiles(
    parseDesignFiles(item.desainUtama),
    parseDesignFiles(item.materiDesain),
    parseDesignFiles(item.logoSponsor)
  )

  const hasilDesain = parseDesignFiles(item.hasilDesain)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PreviewPane
        title="Desain Awal"
        files={desainAwal}
        emptyLabel="Belum ada materi desain awal"
      />
      <PreviewPane
        title="Hasil Desain / Desain Revisi"
        files={hasilDesain}
        emptyLabel="Belum ada hasil dari desainer"
        dropzone={hasilDropzone}
        uploadBlockedReason={hasilUploadBlockedReason}
      />
    </div>
  )
}
