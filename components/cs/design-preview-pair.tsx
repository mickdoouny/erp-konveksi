"use client"

import { useRef, useState } from "react"
import {
  parseDesignFiles,
  type DesignFile,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import { openImageInNewTab } from "@/lib/image-viewer"

export type DesignPreviewDropzoneProps = {
  onFiles: (files: FileList) => void
  uploading?: boolean
  accept?: string
}

type DesignPreviewPairProps = {
  item: Pick<
    DesignQueueItemRecord,
    "desainUtama" | "logoSponsor" | "hasilDesain" | "materiDesain"
  >
  hasilDropzone?: DesignPreviewDropzoneProps
}

const IMAGE_UPLOAD_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i

function isImageUploadFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true
  return IMAGE_UPLOAD_EXT.test(file.name)
}

function imageFilesFromList(fileList: FileList): FileList {
  const dataTransfer = new DataTransfer()
  for (const file of Array.from(fileList)) {
    if (isImageUploadFile(file)) {
      dataTransfer.items.add(file)
    }
  }
  return dataTransfer.files
}

function mergeFiles(...groups: DesignFile[][]): DesignFile[] {
  const seen = new Set<string>()
  const result: DesignFile[] = []

  for (const group of groups) {
    for (const file of group) {
      const key = file.url || file.name
      if (seen.has(key)) continue
      seen.add(key)
      result.push(file)
    }
  }

  return result
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)
}

function PreviewPane({
  title,
  files,
  emptyLabel,
  dropzone,
}: {
  title: string
  files: DesignFile[]
  emptyLabel: string
  dropzone?: DesignPreviewDropzoneProps
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const imageFiles = files.filter((f) => isImageUrl(f.url))
  const otherFiles = files.filter((f) => !isImageUrl(f.url))
  const accept = dropzone?.accept ?? "image/*"
  const uploading = dropzone?.uploading ?? false
  const dropzoneEnabled = Boolean(dropzone) && !uploading

  function submitFiles(fileList: FileList | null) {
    if (!dropzone || !fileList?.length || uploading) return
    const images = imageFilesFromList(fileList)
    if (!images.length) {
      alert("Hanya file gambar yang didukung (PNG, JPG, GIF, WebP, dll.)")
      return
    }
    dropzone.onFiles(images)
  }

  const dragHandlers = dropzone
    ? {
        onDragEnter(event: React.DragEvent) {
          if (uploading) return
          event.preventDefault()
          event.stopPropagation()
          dragDepthRef.current += 1
          setIsDragging(true)
        },
        onDragOver(event: React.DragEvent) {
          if (uploading) return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = "copy"
          setIsDragging(true)
        },
        onDragLeave(event: React.DragEvent) {
          event.preventDefault()
          event.stopPropagation()
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
          if (dragDepthRef.current === 0) {
            setIsDragging(false)
          }
        },
        onDrop(event: React.DragEvent) {
          if (uploading) return
          event.preventDefault()
          event.stopPropagation()
          dragDepthRef.current = 0
          setIsDragging(false)
          submitFiles(event.dataTransfer.files)
        },
      }
    : undefined

  function openFilePicker() {
    if (!dropzoneEnabled) return
    fileInputRef.current?.click()
  }

  const dropzoneSurfaceClass = dropzone
    ? isDragging
      ? "border-orange-500/70 bg-orange-500/10 ring-1 ring-orange-500/30"
      : "border-zinc-700 bg-zinc-950/30 hover:border-zinc-600"
    : "border-zinc-700"

  const content = (
    <>
      {files.length === 0 ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm transition ${dropzoneSurfaceClass} ${dropzoneEnabled ? "cursor-pointer" : ""} ${uploading ? "pointer-events-none opacity-70" : ""}`}
          onClick={dropzoneEnabled ? openFilePicker : undefined}
          onKeyDown={
            dropzoneEnabled
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    openFilePicker()
                  }
                }
              : undefined
          }
          role={dropzone ? "button" : undefined}
          tabIndex={dropzoneEnabled ? 0 : undefined}
        >
          <p className={isDragging ? "text-orange-300" : "text-zinc-500"}>
            {uploading
              ? "Mengunggah…"
              : isDragging
                ? "Lepaskan untuk mengunggah"
                : emptyLabel}
          </p>
          {dropzone && !uploading && !isDragging ? (
            <p className="text-xs text-zinc-600">
              Seret gambar ke sini atau klik untuk memilih file
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {imageFiles.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {imageFiles.map((file, index) => (
                <button
                  key={`${file.url}-${index}`}
                  type="button"
                  onClick={() => openImageInNewTab(file.url, file.name)}
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 text-left"
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
              ))}
            </div>
          ) : null}

          {otherFiles.length > 0 ? (
            <ul className="space-y-2">
              {otherFiles.map((file, index) => (
                <li key={`${file.url}-${index}`}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm font-medium text-orange-400 hover:text-orange-300"
                  >
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {dropzone ? (
            <div
              className={`rounded-xl border border-dashed px-4 py-3 text-center text-xs transition ${dropzoneSurfaceClass} ${dropzoneEnabled ? "cursor-pointer" : ""} ${uploading ? "pointer-events-none opacity-70" : ""}`}
              onClick={dropzoneEnabled ? openFilePicker : undefined}
            >
              <p className={isDragging ? "text-orange-300" : "text-zinc-500"}>
                {uploading
                  ? "Mengunggah…"
                  : isDragging
                    ? "Lepaskan untuk mengganti hasil desain"
                    : "Seret gambar baru ke sini atau klik untuk mengunggah ulang"}
              </p>
            </div>
          ) : null}
        </>
      )}
    </>
  )

  return (
    <div className="flex min-h-[320px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-4 py-3 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-400/90">
          {title}
        </h3>
      </div>

      <div
        className={`relative flex flex-1 flex-col gap-3 p-4 ${dropzone && isDragging && files.length > 0 ? "rounded-b-2xl ring-1 ring-inset ring-orange-500/30" : ""}`}
        {...dragHandlers}
      >
        {dropzone && isDragging && files.length > 0 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-orange-500/70 bg-orange-500/10"
          >
            <p className="text-sm font-medium text-orange-300">
              Lepaskan untuk mengganti hasil desain
            </p>
          </div>
        ) : null}
        {dropzone ? (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              submitFiles(event.target.files)
              event.target.value = ""
            }}
          />
        ) : null}
        {content}
      </div>
    </div>
  )
}

export default function DesignPreviewPair({
  item,
  hasilDropzone,
}: DesignPreviewPairProps) {
  const desainAwal = mergeFiles(
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
      />
    </div>
  )
}
