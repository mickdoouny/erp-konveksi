"use client"

import {
  isDesignImageUrl,
  parseDesignFiles,
  type DesignFile,
} from "@/lib/cs-antrian-desain"
import { openImageInNewTab } from "@/lib/image-viewer"

export type OperatorDesignFilesData = {
  fileDesainFinal?: string | null
  needsDTF?: boolean
  DesignQueueItem?: {
    artikelId?: string
    hasilDesain?: string | null
    fileDesainProduksi?: string | null
    fileDtfVendor?: string | null
    fileDtfProof?: string | null
    perluDtf?: boolean
  } | null
}

function DesignFileEntry({
  file,
  label,
}: {
  file: DesignFile
  label?: string
}) {
  const displayName = label ?? (file.name?.trim() || "File")
  const isImage = isDesignImageUrl(file.url)

  if (isImage) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-xs font-medium text-zinc-400">{displayName}</p>
        <button
          type="button"
          className="mt-2 block w-full overflow-hidden rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          onClick={() => openImageInNewTab(file.url, file.name)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt={displayName}
            className="max-h-36 w-full bg-zinc-950 object-contain"
          />
        </button>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <button
            type="button"
            className="text-xs text-orange-400 hover:text-orange-300"
            onClick={() => openImageInNewTab(file.url, file.name)}
          >
            Buka gambar penuh
          </button>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 underline hover:text-zinc-200"
          >
            Unduh / buka file
          </a>
        </div>
      </div>
    )
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-orange-400 transition hover:border-orange-500/40 hover:text-orange-300"
    >
      {displayName}
    </a>
  )
}

function DirectFileLink({
  url,
  label,
}: {
  url: string
  label: string
}) {
  const isImage = isDesignImageUrl(url)

  if (isImage) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <button
          type="button"
          className="mt-2 block w-full overflow-hidden rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          onClick={() => openImageInNewTab(url, label)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="max-h-36 w-full bg-zinc-950 object-contain"
          />
        </button>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <button
            type="button"
            className="text-xs text-orange-400 hover:text-orange-300"
            onClick={() => openImageInNewTab(url, label)}
          >
            Buka gambar penuh
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 underline hover:text-zinc-200"
          >
            Unduh / buka file
          </a>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-orange-400 transition hover:border-orange-500/40 hover:text-orange-300"
    >
      {label}
    </a>
  )
}

export function OperatorDesignFiles({ data }: { data: OperatorDesignFilesData }) {
  const dqi = data.DesignQueueItem
  const cdrRaw = data.fileDesainFinal ?? dqi?.fileDesainProduksi
  const cdrFiles = parseDesignFiles(cdrRaw)
  const hasilFiles = parseDesignFiles(dqi?.hasilDesain)
  const needsDtf = Boolean(data.needsDTF || dqi?.perluDtf)
  const dtfVendor = dqi?.fileDtfVendor?.trim()
  const dtfProof = dqi?.fileDtfProof?.trim()

  const hasAny =
    cdrFiles.length > 0 ||
    hasilFiles.length > 0 ||
    (needsDtf && Boolean(dtfVendor || dtfProof))

  if (!hasAny) {
    return (
      <p className="mt-3 text-sm text-amber-300/90">
        Belum ada file desain dari desainer.
      </p>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        File desainer
        {dqi?.artikelId ? (
          <span className="normal-case text-zinc-400"> · {dqi.artikelId}</span>
        ) : null}
      </p>

      {cdrFiles.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">CDR produksi</p>
          <div className="flex flex-wrap gap-2">
            {cdrFiles.map((file) => (
              <DesignFileEntry
                key={file.url || file.name}
                file={file}
                label={file.name?.trim() || "Buka / unduh CDR"}
              />
            ))}
          </div>
        </div>
      ) : null}

      {hasilFiles.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">Hasil desain</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {hasilFiles.map((file) => (
              <DesignFileEntry key={file.url || file.name} file={file} />
            ))}
          </div>
        </div>
      ) : null}

      {needsDtf && (dtfVendor || dtfProof) ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">File DTF</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {dtfVendor ? (
              <DirectFileLink url={dtfVendor} label="File vendor DTF" />
            ) : null}
            {dtfProof ? (
              <DirectFileLink url={dtfProof} label="Hasil vendor DTF" />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
