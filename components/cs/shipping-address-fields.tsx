import type { ShippingAddressFieldErrors } from "@/lib/shipping-address"

export type ShippingAddressFieldKey =
  | "alamat"
  | "provinsi"
  | "kotaKabupaten"
  | "kecamatan"
  | "kodePos"

type ShippingAddressFieldsProps = {
  alamat: string
  provinsi: string
  kotaKabupaten: string
  kecamatan: string
  kodePos: string
  errors?: ShippingAddressFieldErrors | null
  onChange: (field: ShippingAddressFieldKey, value: string) => void
  onClearError?: (field: ShippingAddressFieldKey) => void
  fieldErrorClass?: (hasError: boolean) => string
}

function defaultFieldErrorClass(hasError: boolean): string {
  return hasError ? "border-red-500/60 focus:border-red-400" : ""
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-400">{message}</p>
}

export function ShippingAddressFields({
  alamat,
  provinsi,
  kotaKabupaten,
  kecamatan,
  kodePos,
  errors,
  onChange,
  onClearError,
  fieldErrorClass = defaultFieldErrorClass,
}: ShippingAddressFieldsProps) {
  function handleChange(field: ShippingAddressFieldKey, value: string) {
    onChange(field, value)
    onClearError?.(field)
  }

  return (
    <div className="md:col-span-2 space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-300">
          Alamat pengiriman <span className="text-red-400">*</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Alamat harus lengkap untuk estimasi pengiriman otomatis
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">
            Provinsi <span className="text-red-400">*</span>
          </span>
          <input
            className={`neo-input w-full ${fieldErrorClass(Boolean(errors?.provinsi))}`}
            value={provinsi}
            onChange={(e) => handleChange("provinsi", e.target.value)}
            placeholder="Contoh: Jawa Barat"
            aria-invalid={Boolean(errors?.provinsi)}
          />
          <FieldError message={errors?.provinsi} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">
            Kota/Kabupaten <span className="text-red-400">*</span>
          </span>
          <input
            className={`neo-input w-full ${fieldErrorClass(Boolean(errors?.kotaKabupaten))}`}
            value={kotaKabupaten}
            onChange={(e) => handleChange("kotaKabupaten", e.target.value)}
            placeholder="Contoh: Bandung"
            aria-invalid={Boolean(errors?.kotaKabupaten)}
          />
          <FieldError message={errors?.kotaKabupaten} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">
            Kecamatan <span className="text-red-400">*</span>
          </span>
          <input
            className={`neo-input w-full ${fieldErrorClass(Boolean(errors?.kecamatan))}`}
            value={kecamatan}
            onChange={(e) => handleChange("kecamatan", e.target.value)}
            placeholder="Contoh: Coblong"
            aria-invalid={Boolean(errors?.kecamatan)}
          />
          <FieldError message={errors?.kecamatan} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">
            Kode pos <span className="text-red-400">*</span>
          </span>
          <input
            className={`neo-input w-full ${fieldErrorClass(Boolean(errors?.kodePos))}`}
            value={kodePos}
            onChange={(e) => handleChange("kodePos", e.target.value)}
            placeholder="40131"
            inputMode="numeric"
            maxLength={5}
            aria-invalid={Boolean(errors?.kodePos)}
          />
          <FieldError message={errors?.kodePos} />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-zinc-400">
            Detail alamat (jalan, RT/RW, nomor){" "}
            <span className="text-red-400">*</span>
          </span>
          <textarea
            className={`neo-input min-h-[88px] w-full resize-y ${fieldErrorClass(Boolean(errors?.alamat))}`}
            value={alamat}
            onChange={(e) => handleChange("alamat", e.target.value)}
            placeholder="Jl. Merdeka No. 10, RT 02/RW 05"
            aria-invalid={Boolean(errors?.alamat)}
          />
          <FieldError message={errors?.alamat} />
        </label>
      </div>
    </div>
  )
}
