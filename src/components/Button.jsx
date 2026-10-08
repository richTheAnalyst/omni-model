import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export function buttonClass(variant = 'secondary', size = 'md', extra = '') {
  return `btn btn-${variant} btn-${size} ${extra}`.trim()
}

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, `${loading ? 'is-loading' : ''} ${className}`)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
      {iconRight && !loading ? <Icon name={iconRight} size={16} /> : null}
    </button>
  )
}

export function LinkButton({ to, variant = 'secondary', size = 'md', icon, iconRight, className = '', children, ...rest }) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)} {...rest}>
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={16} /> : null}
    </Link>
  )
}
