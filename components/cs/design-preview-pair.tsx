"use client"

import {
  parseDesignFiles,
  type DesignFile,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import { openImageInNewTab } from "@/lib/image-viewer"

type DesignPreviewPairProps = {
  item: Pick<
    DesignQueueItemRecord,
    "desainUtama" | "logoSponsor" | "hasilDesain" | "materiDesain"
  >
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
}: {
  title: string
  files: DesignFile[]
  emptyLabel: string
}) {
  const imageFiles = files.filter((f) => isImageUrl(f.url))
  const otherFiles = files.filter((f) => !isImageUrl(f.url))

  return (
    <div className="flex min-h-[320px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-4 py-3 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-400/90">
          {title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {files.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
            {emptyLabel}
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
          </>
        )}
      </div>
    </div>
  )
}

export default function DesignPreviewPair({ item }: DesignPreviewPairProps) {
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
      />
    </div>
  )
}
