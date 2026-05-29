"use client"

import { formatRupiahDisplay } from "@/lib/format-rupiah"

type RupiahInputProps = {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
}

export function RupiahInput({
  value,
  onChange,
  readOnly = false,
  placeholder,
  required,
  className = "neo-input w-full",
  id,
}: RupiahInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!onChange || readOnly) return
    const digits = e.target.value.replace(/\D/g, "")
    if (digits === "") {
      onChange("")
      return
    }
    const num = parseInt(digits, 10)
    if (Number.isNaN(num)) {
      onChange("")
      return
    }
    onChange(formatRupiahDisplay(num))
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      value={value}
      onChange={handleChange}
      readOnly={readOnly}
      aria-readonly={readOnly || undefined}
      tabIndex={readOnly ? -1 : undefined}
      placeholder={placeholder}
      required={required}
    />
  )
}
