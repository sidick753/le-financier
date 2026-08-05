interface SectionCardProps {
  title: string;
  sub?: string;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, sub, action, actionHref = "#", children }: SectionCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-[16px] font-bold tracking-tight">{title}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        {action && (
          <a href={actionHref} className="shrink-0 text-xs font-medium text-blue-600 hover:underline">
            {action}
          </a>
        )}
      </div>
      {children}
    </div>
  );
}
