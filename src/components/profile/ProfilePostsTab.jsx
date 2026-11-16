import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { MessageCircle } from 'lucide-react'
import Avatar from '../Avatar'
import ProfileLink from '../ProfileLink'
import { db } from '../../lib/firebase'

function formatPostDate(timestamp) {
  if (!timestamp?.toDate) return 'Just now'
  return timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function PostSkeleton() {
  return <div className="flex gap-3 border-b border-gray-200 p-5 motion-safe:animate-pulse dark:border-gray-800"><div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-800" /><div className="flex-1 space-y-3"><div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" /></div></div>
}

export default function ProfilePostsTab({ isOwn = false, uid }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const snapshot = await getDocs(query(collection(db, 'posts'), where('uid', '==', uid)))
      setPosts(snapshot.docs.map((post) => ({ id: post.id, ...post.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load posts.')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { loadPosts() }, [loadPosts])

  return <section>{loading && Array.from({ length: 3 }, (_, index) => <PostSkeleton key={index} />)}{error && <p className="p-5 text-sm text-red-600 dark:text-red-400">{error} <button type="button" onClick={loadPosts} className="font-bold underline">Retry</button></p>}{!loading && !error && !posts.length && <p className="p-5 text-gray-500 dark:text-gray-400">No posts yet</p>}{posts.map((post) => {
    const identity = <><span className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{post.name}</span> <span className="truncate text-sm font-normal text-gray-500 dark:text-gray-400">{post.username}</span></>
    return <article key={post.id} className="flex gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
      {isOwn ? <Avatar name={post.name} photoURL={post.photoURL} /> : <ProfileLink uid={post.uid} label={`View ${post.name}'s profile`} tabIndex={-1} aria-hidden="true" className="self-start rounded-full transition hover:ring-2 hover:ring-blue-100 dark:hover:ring-blue-900/40"><Avatar name={post.name} photoURL={post.photoURL} /></ProfileLink>}
      <div className="min-w-0 flex-1"><p>{isOwn ? identity : <ProfileLink uid={post.uid} label={`View ${post.name}'s profile`} className="hover:underline">{identity}</ProfileLink>} <span className="font-normal text-gray-400">· {formatPostDate(post.createdAt)}{post.editedAt && ' · edited'}</span></p><p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.text}</p><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{post.likes || 0} likes · {post.repliesCount || 0} replies</p></div>
    </article>
  })}</section>
}
