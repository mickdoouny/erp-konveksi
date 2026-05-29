"use client"

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export function BtnPrimary({ className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      className={`neo-btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

export function BtnGhost({ className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      className={`rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-orange-500/50 hover:text-orange-400 disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

export function BtnApprove({ className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      className={`neo-btn-primary px-4 py-2 text-sm disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

export function BtnRevisi({ className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      className={`rounded-lg border border-red-500/50 bg-red-950/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/80 disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
