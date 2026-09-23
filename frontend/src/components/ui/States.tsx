import Button from './Button';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"><div className="m-5 h-3 w-24 rounded bg-slate-200" /><div className="mx-5 mt-7 h-8 w-32 rounded bg-slate-200" /><span className="sr-only">{label}</span></div>)}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600">+</div><h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"><h2 className="text-lg font-semibold text-red-900">Something went wrong</h2><p className="mt-2 text-sm text-red-700">We couldn't load this information.</p>{onRetry && <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5">Try again</Button>}</div>;
}
