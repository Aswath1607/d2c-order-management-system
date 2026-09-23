import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-500',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-indigo-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  };
  const sizes = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-10 px-4 text-sm', lg: 'min-h-12 px-5 text-base' };
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} />;
}
