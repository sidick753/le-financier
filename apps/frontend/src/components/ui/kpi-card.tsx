interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "ok" | "";
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export function KpiCard({ label, value, sub, trend, icon, iconBg, iconColor }: KpiCardProps) {
  const trendClass =
    trend === "up" ? "text-green-600 font-semibold" :
    trend === "down" ? "text-red-600 font-semibold" :
    trend === "ok" ? "text-green-600 font-semibold" :
    "text-slate-500";

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-[18px]">
      <div>
        <p className="mb-2 text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-[26px] font-bold leading-none tracking-tight">{value}</p>
        {sub && <p className={`mt-[5px] text-[11px] ${trendClass}`}>{sub}</p>}
      </div>
      <div
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
    </div>
  );
}
