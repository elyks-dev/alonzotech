import { useEffect, useState } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import Avatar from './Avatar'
import { db } from '../lib/firebase'
import { loadLikes } from '../services/engagement'

const cache = new Map()
function loadProfile(uid) {
  if (!cache.has(uid)) cache.set(uid, getDoc(doc(db, 'users', uid)).then((snapshot) => snapshot.exists() ? snapshot.data() : null).catch(() => null))
  return cache.get(uid)
}

export default function LikesModal({ parentCollection, parentId, likesCount = 0, onClose }) {
  const [likes, setLikes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    loadLikes(parentCollection, parentId).then(async (items) => setLikes(await Promise.all(items.slice(0, 50).map(async (item) => {
      const current = item.uid ? await loadProfile(item.uid) : null
      return current ? { ...item, ...current, id: item.id } : item
    })))).catch((loadError) => setError(loadError.message || 'Unable to load likes.')).finally(() => setLoading(false))
  }, [parentCollection, parentId])
  const count = typeof likesCount === 'number' ? likesCount : likes.length
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
    <section className="thin-scrollbar max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Liked by <span className="text-base font-normal text-gray-500 dark:text-gray-400">· {count}</span></h2><button onClick={onClose} className="text-2xl text-gray-500" aria-label="Close">×</button></div>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && !likes.length && <p className="text-sm text-gray-500">No likes yet</p>}
      {!loading && !error && likes.map((like) => <div className="flex items-center gap-3 border-b border-gray-200 py-3 dark:border-gray-800" key={like.id}><Avatar name={like.name} photoURL={like.photoURL} /><div className="min-w-0"><p className="truncate text-sm font-bold">{like.name}</p>{like.username && <p className="truncate text-sm text-gray-500">{like.username}</p>}</div></div>)}
      {!loading && !error && count > 50 && <p className="pt-3 text-center text-xs text-gray-500 dark:text-gray-400">Showing the first 50 likes</p>}
    </section>
  </div>
}
