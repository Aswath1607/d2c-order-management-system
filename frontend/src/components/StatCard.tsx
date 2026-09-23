type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  accent?: 'indigo' | 'emerald' | 'amber' | 'red' | 'slate';
};

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function StatCard({ title, value, subtitle, accent = 'slate' }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
      {subtitle && <div className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${accentMap[accent]}`}>{subtitle}</div>}
    </div>
  );
}
