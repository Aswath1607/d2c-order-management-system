interface BadgeProps { children: React.ReactNode; tone?: 'slate' | 'indigo' | 'green' | 'amber' | 'red'; }

export default function Badge({ children, tone = 'slate' }: BadgeProps) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
