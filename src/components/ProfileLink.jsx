import { Link } from 'react-router-dom'

export default function ProfileLink({ uid, children, className = '', label, ...linkProps }) {
  if (!uid) return children
  return (
    <Link
      to={`/profile/${uid}`}
      onClick={(event) => event.stopPropagation()}
      className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${className}`}
      aria-label={label}
      {...linkProps}
    >
      {children}
    </Link>
  )
}
