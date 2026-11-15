import { useState } from 'react'

export default function Avatar({ name = 'A', photoURL = '', className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  if (photoURL && !imageFailed) return <img src={photoURL} alt="" onError={() => setImageFailed(true)} className={`h-11 w-11 shrink-0 rounded-full object-cover ${className}`} />
  return <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 ${className}`}>{name.charAt(0).toUpperCase()}</div>
}
