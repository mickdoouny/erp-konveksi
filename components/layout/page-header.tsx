export function PageHeader({
  badge,
  title,
  titleAccent,
  description,
}: {
  badge?: string
  title: string
  titleAccent?: string
  description?: string
}) {
  return (
    <header className="mb-8">
      {badge ? (
        <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-orange-500">
          {badge}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight text-white">
        {title}
        {titleAccent ? (
          <span className="text-orange-400"> {titleAccent}</span>
        ) : null}
      </h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">{description}</p>
      ) : null}
    </header>
  )
}
