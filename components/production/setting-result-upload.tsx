"use client"



import { useEffect, useRef, useState } from "react"

import {

  filesFromDataTransfer,

  isDesignImageFile,

  mergeDesignFiles,

  parseDesignFiles,

  serializeDesignFiles,

  type DesignFile,

} from "@/lib/cs-antrian-desain"

import { openImageInNewTab } from "@/lib/image-viewer"



type SettingResultUploadProps = {

  pipelineId: string

  settingResultFiles: string | null | undefined

  disabled?: boolean

  locked?: boolean

  onUpdated: (settingResultFiles: string) => void

}



function isDragEventInside(

  event: React.DragEvent,

  element: EventTarget & Element

): boolean {

  const related = event.relatedTarget

  if (!related || !(related instanceof Node)) return false

  return element.contains(related)

}



export function SettingResultUpload({

  pipelineId,

  settingResultFiles,

  disabled = false,

  locked = false,

  onUpdated,

}: SettingResultUploadProps) {

  const inputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)

  const [feedback, setFeedback] = useState<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)

  const files = parseDesignFiles(settingResultFiles)

  const uploadBlocked = disabled || locked || uploading



  async function persistFiles(merged: DesignFile[]) {

    const serialized = serializeDesignFiles(merged)

    const res = await fetch(`/api/production-pipeline/${pipelineId}`, {

      method: "PATCH",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        action: "update_setting_files",

        settingResultFiles: serialized,

      }),

    })

    const json = await res.json()

    if (!res.ok) {

      throw new Error(json.message ?? "Gagal menyimpan hasil setting")

    }

    onUpdated(serialized)

  }



  async function handleUpload(fileList: FileList | null) {

    if (!fileList?.length || uploadBlocked) return



    const imageFiles = Array.from(fileList).filter(isDesignImageFile)

    if (!imageFiles.length) {

      setFeedback("Hanya file gambar yang didukung (PNG, JPG, WebP, dll.)")

      return

    }



    setFeedback(null)

    setUploading(true)

    try {

      const formData = new FormData()

      for (const file of imageFiles) {

        formData.append("files", file)

      }

      const uploadRes = await fetch("/api/upload", {

        method: "POST",

        body: formData,

      })

      const uploadJson = (await uploadRes.json()) as {

        files?: { name: string; url: string }[]

        message?: string

      }

      if (!uploadRes.ok || !uploadJson.files?.length) {

        setFeedback(uploadJson.message ?? "Gagal upload file")

        return

      }



      const merged = mergeDesignFiles(files, uploadJson.files)

      await persistFiles(merged)

      setFeedback("Hasil setting berhasil diunggah")

    } catch (error) {

      setFeedback(

        error instanceof Error ? error.message : "Gagal mengunggah hasil setting"

      )

    } finally {

      setUploading(false)

      if (inputRef.current) inputRef.current.value = ""

    }

  }



  useEffect(() => {

    if (uploadBlocked) return



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

  }, [uploadBlocked])



  const dragHandlers = uploadBlocked

    ? undefined

    : {

        onDragEnter(event: React.DragEvent) {

          event.preventDefault()

          event.stopPropagation()

          setIsDragging(true)

        },

        onDragOver(event: React.DragEvent) {

          event.preventDefault()

          event.stopPropagation()

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

          void handleUpload(filesFromDataTransfer(event.dataTransfer))

        },

      }



  return (

    <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-950/20 p-4">

      <div className="flex flex-wrap items-center gap-2">

        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">

          Hasil setting (foto)

        </p>

        {locked ? (

          <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">

            Sudah ACC — tidak dapat diubah

          </span>

        ) : null}

      </div>

      <p className="mt-1 text-xs text-zinc-500">

        {locked

          ? "Foto hasil setting yang sudah disetujui konsumen."

          : disabled

            ? "Foto hasil setting menunggu konfirmasi CS — tidak dapat diubah."

            : "Unggah foto hasil setting untuk dibandingkan dengan mockup. Wajib minimal satu foto sebelum kirim ke CS."}

      </p>



      {files.length > 0 ? (

        <div className="mt-3 flex flex-wrap gap-2">

          {files.map((file) => (

            <button

              key={file.url || file.name}

              type="button"

              onClick={() => openImageInNewTab(file.url)}

              className="overflow-hidden rounded-lg border border-zinc-700 transition hover:border-violet-500/50"

            >

              {/* eslint-disable-next-line @next/next/no-img-element */}

              <img

                src={file.url}

                alt={file.name}

                className="h-20 w-20 object-cover"

              />

            </button>

          ))}

        </div>

      ) : (

        <p className="mt-2 text-sm text-zinc-500">Belum ada foto hasil setting.</p>

      )}



      {!uploadBlocked ? (

        <>

          <div

            role="button"

            tabIndex={0}

            className={`mt-3 rounded-lg border border-dashed p-4 text-center transition ${

              isDragging

                ? "border-violet-500/70 bg-violet-500/10 ring-1 ring-violet-500/30"

                : "border-zinc-700 bg-zinc-950/30 hover:border-zinc-600"

            }`}

            {...dragHandlers}

            onClick={() => inputRef.current?.click()}

            onKeyDown={(event) => {

              if (event.key === "Enter" || event.key === " ") {

                event.preventDefault()

                inputRef.current?.click()

              }

            }}

          >

            <p className="text-xs text-zinc-400">

              Seret & lepas foto di sini, atau klik untuk memilih file

            </p>

          </div>

          <input

            ref={inputRef}

            type="file"

            accept="image/*"

            multiple

            className="hidden"

            onChange={(e) => void handleUpload(e.target.files)}

          />

        </>

      ) : null}



      {feedback ? (

        <p className="mt-2 text-xs text-violet-300/90">{feedback}</p>

      ) : null}

    </div>

  )

}


