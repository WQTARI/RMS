export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) => {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="text-start">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm font-bold text-slate-400 mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
