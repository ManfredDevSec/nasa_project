const STYLES = {
  primary:   { backgroundColor: 'var(--text)', color: 'var(--bg)', border: 'none' },
  secondary: { backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--text)' },
  quiet:     { backgroundColor: 'transparent', color: 'var(--muted)', border: 'none' },
}

export default function Button({ variant = 'primary', className = '', style = {}, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center min-h-[56px] px-5 text-sm font-medium rounded-[4px] transition-opacity duration-150 disabled:opacity-40 cursor-pointer ${variant === 'quiet' ? 'hover:underline' : 'hover:opacity-90'} ${className}`}
      style={{ ...STYLES[variant], ...style }}
      {...props}
    />
  )
}
