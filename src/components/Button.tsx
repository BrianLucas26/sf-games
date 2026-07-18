import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'border border-border-strong text-ink hover:border-accent/50 hover:bg-surface-hover',
  danger: 'border border-danger/40 text-danger hover:border-danger hover:bg-danger/10',
  ghost: 'text-muted hover:text-ink',
}

// Exported separately so non-<button> elements (react-router's Link) can
// share the exact same look without duplicating the class string.
export function buttonClasses(variant: Variant = 'primary', className = ''): string {
  return `${base} ${variants[variant]} ${className}`.trim()
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />
}
