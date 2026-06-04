"use client"

type DatePickerInputProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
  required?: boolean
  min?: string
  max?: string
}

export function DatePickerInput({
  value,
  onChange,
  className = "neo-input mt-1 cursor-pointer py-2.5 text-sm [color-scheme:dark]",
  id,
  required,
  min,
  max,
}: DatePickerInputProps) {
  function openPicker(input: HTMLInputElement) {
    try {
      input.showPicker()
    } catch {
      // showPicker may throw if not triggered by user gesture or unsupported
    }
  }

  return (
    <input
      id={id}
      type="date"
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => openPicker(e.currentTarget)}
      onFocus={(e) => openPicker(e.currentTarget)}
      onKeyDown={(e) => e.preventDefault()}
      onBeforeInput={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      required={required}
      min={min}
      max={max}
    />
  )
}
