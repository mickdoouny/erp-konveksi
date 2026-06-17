"use client"



import { useState } from "react"

import { BtnGhost, BtnPrimary } from "@/components/ui/buttons"

import {

  ShippingAddressFields,

  type ShippingAddressFieldKey,

} from "@/components/cs/shipping-address-fields"

import type { EditKonsumenPrefill } from "@/lib/cs-antrian-desain"

import {

  isShippingAddressComplete,

  validateShippingAddress,

} from "@/lib/shipping-address"



type EditKonsumenModalProps = {

  open: boolean

  item: EditKonsumenPrefill | null

  busy?: boolean

  onClose: () => void

  onSubmit: (payload: {

    namaKonsumen: string

    noTelepon: string

    alamatPengiriman: string

    provinsi: string

    kotaKabupaten: string

    kecamatan: string

    kodePos: string

  }) => Promise<{ ok: boolean; message?: string }>

}



function EditKonsumenFormBody({

  item,

  busy,

  onClose,

  onSubmit,

}: {

  item: EditKonsumenPrefill

  busy: boolean

  onClose: () => void

  onSubmit: EditKonsumenModalProps["onSubmit"]

}) {

  const [namaKonsumen, setNamaKonsumen] = useState(

    () => item.namaKonsumen?.trim() ?? ""

  )

  const [noTelepon, setNoTelepon] = useState(() => item.noTelepon?.trim() ?? "")

  const [alamatPengiriman, setAlamatPengiriman] = useState(

    () => item.alamatPengiriman?.trim() ?? ""

  )

  const [provinsi, setProvinsi] = useState(() => item.provinsi?.trim() ?? "")

  const [kotaKabupaten, setKotaKabupaten] = useState(

    () => item.kotaKabupaten?.trim() ?? ""

  )

  const [kecamatan, setKecamatan] = useState(() => item.kecamatan?.trim() ?? "")

  const [kodePos, setKodePos] = useState(() => item.kodePos?.trim() ?? "")

  const [saveError, setSaveError] = useState<string | null>(null)

  const [addressErrors, setAddressErrors] = useState<

    ReturnType<typeof validateShippingAddress> | null

  >(null)

  const [saving, setSaving] = useState(false)



  const canSubmit =

    namaKonsumen.trim() !== "" &&

    noTelepon.trim() !== "" &&

    isShippingAddressComplete({

      alamat: alamatPengiriman,

      provinsi,

      kotaKabupaten,

      kecamatan,

      kodePos,

    })



  function handleAddressChange(field: ShippingAddressFieldKey, value: string) {

    switch (field) {

      case "alamat":

        setAlamatPengiriman(value)

        break

      case "provinsi":

        setProvinsi(value)

        break

      case "kotaKabupaten":

        setKotaKabupaten(value)

        break

      case "kecamatan":

        setKecamatan(value)

        break

      case "kodePos":

        setKodePos(value)

        break

    }

  }



  function clearAddressError(field: ShippingAddressFieldKey) {

    setAddressErrors((prev) => {

      if (!prev?.[field]) return prev

      const next = { ...prev }

      delete next[field]

      return Object.keys(next).length > 0 ? next : null

    })

  }



  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault()

    if (saving || busy) return



    const nextAddressErrors = validateShippingAddress({

      alamat: alamatPengiriman,

      provinsi,

      kotaKabupaten,

      kecamatan,

      kodePos,

    })

    if (Object.keys(nextAddressErrors).length > 0) {

      setAddressErrors(nextAddressErrors)

      setSaveError("Lengkapi semua kolom alamat pengiriman")

      return

    }



    if (!canSubmit) return



    setSaving(true)

    setSaveError(null)

    setAddressErrors(null)

    try {

      const result = await onSubmit({

        namaKonsumen: namaKonsumen.trim(),

        noTelepon: noTelepon.trim(),

        alamatPengiriman: alamatPengiriman.trim(),

        provinsi: provinsi.trim(),

        kotaKabupaten: kotaKabupaten.trim(),

        kecamatan: kecamatan.trim(),

        kodePos: kodePos.trim(),

      })

      if (!result.ok) {

        setSaveError(result.message ?? "Gagal menyimpan data konsumen")

      }

    } finally {

      setSaving(false)

    }

  }



  return (

    <>

      <div className="mb-4">

        <h2

          id="edit-konsumen-form-title"

          className="text-lg font-semibold text-zinc-100"

        >

          Edit informasi konsumen

        </h2>

        <p className="mt-1 text-sm text-zinc-400">

          {item.sppNumber?.trim()

            ? `Perubahan berlaku untuk semua artikel dengan No. SPP ${item.sppNumber.trim()}.`

            : "Perbarui nama, telepon, dan alamat pengiriman."}

        </p>

      </div>



      <form onSubmit={handleSubmit}>

        <div className="grid gap-4 md:grid-cols-2">

          <label className="block text-sm md:col-span-1">

            <span className="mb-1 block text-zinc-400">Nama konsumen *</span>

            <input

              className="neo-input w-full"

              value={namaKonsumen}

              onChange={(e) => setNamaKonsumen(e.target.value)}

              required

              autoFocus

            />

          </label>

          <label className="block text-sm md:col-span-1">

            <span className="mb-1 block text-zinc-400">No. telepon *</span>

            <input

              className="neo-input w-full"

              value={noTelepon}

              onChange={(e) => setNoTelepon(e.target.value)}

              required

            />

          </label>



          <ShippingAddressFields

            alamat={alamatPengiriman}

            provinsi={provinsi}

            kotaKabupaten={kotaKabupaten}

            kecamatan={kecamatan}

            kodePos={kodePos}

            errors={addressErrors}

            onChange={handleAddressChange}

            onClearError={clearAddressError}

          />

        </div>



        {saveError ? (

          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">

            {saveError}

          </p>

        ) : null}



        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-zinc-700/40 pt-4">

          <BtnGhost

            type="button"

            onClick={onClose}

            disabled={saving || busy}

          >

            Batal

          </BtnGhost>

          <BtnPrimary type="submit" disabled={!canSubmit || saving || busy}>

            {saving || busy ? "Menyimpan…" : "Simpan perubahan"}

          </BtnPrimary>

        </div>

      </form>

    </>

  )

}



export function EditKonsumenModal({

  open,

  item,

  busy = false,

  onClose,

  onSubmit,

}: EditKonsumenModalProps) {

  if (!open || !item) return null



  return (

    <div

      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"

      role="dialog"

      aria-modal="true"

      aria-labelledby="edit-konsumen-form-title"

    >

      <button

        type="button"

        className="absolute inset-0 bg-black/70 backdrop-blur-sm"

        aria-label="Tutup"

        onClick={onClose}

      />

      <div className="neo-card relative z-10 w-[min(98vw,40rem)] max-w-lg p-5 md:p-6">

        <EditKonsumenFormBody

          key={item.id}

          item={item}

          busy={busy}

          onClose={onClose}

          onSubmit={onSubmit}

        />

      </div>

    </div>

  )

}

