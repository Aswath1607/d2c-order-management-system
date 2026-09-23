interface BadgeProps { children: React.ReactNode; tone?: 'slate' | 'indigo' | 'green' | 'amber' | 'red'; }

export default function Badge({ children, tone = 'slate' }: BadgeProps) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
