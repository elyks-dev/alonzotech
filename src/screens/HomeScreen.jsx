import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bell,
  ArrowUp,
  Heart,
  Home,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  writeBatch,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { addReply as addSharedReply, toggleLike as toggleSharedLike } from '../services/engagement'
import SharedLikesModal from '../components/LikesModal'

const PAGE_SIZE = 10
const POST_MAX_LENGTH = 350
const REPLY_MAX_LENGTH = 350
const userProfileCache = new Map()

async function loadUserProfile(uid) {
  if (!uid) return null
  if (!userProfileCache.has(uid)) {
    userProfileCache.set(uid, getDoc(doc(db, 'users', uid)).then((snapshot) => snapshot.exists() ? snapshot.data() : null).catch(() => null))
  }
  return userProfileCache.get(uid)
}

export function Avatar({ name = 'A', photoURL = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  if (photoURL && !imageFailed) return <img src={photoURL} alt="" onError={() => setImageFailed(true)} className="h-11 w-11 shrink-0 rounded-full object-cover" />
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function formatPostDate(timestamp) {
  if (!timestamp?.toDate) return 'Just now'
  const date = timestamp.toDate()
  const seconds = (Date.now() - date.getTime()) / 1000
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function PostSkeleton({ index = 0 }) {
  const textWidth = index % 2 === 0 ? 'w-full' : 'w-[92%]'
  const secondLineWidth = index % 3 === 0 ? 'w-3/5' : 'w-[70%]'

  return (
    <article aria-hidden="true" className="flex gap-3 border-b border-gray-200 p-5 motion-safe:animate-pulse dark:border-gray-800">
      <div className="h-11 w-11 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className={`mt-4 h-3.5 rounded bg-gray-200 dark:bg-gray-800 ${textWidth}`} />
        <div className={`mt-2 h-3.5 rounded bg-gray-200 dark:bg-gray-800 ${secondLineWidth}`} />
        <div className="mt-4 flex gap-8">
          <div className="h-4 w-10 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-10 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </article>
  )
}

function CreatePostModal({ profile, onClose, onSubmit, initialText = '', title = 'Create post', submitLabel = 'Post' }) {
  const [text, setText] = useState(initialText)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async () => {
    if (!text.trim() || isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit(text.trim())
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to save your post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
      <section className="w-full max-w-xl rounded-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="text-2xl text-gray-500" aria-label="Close">×</button>
        </div>
        <div className="flex gap-3">
          <Avatar name={profile.name} photoURL={profile.photoURL} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{profile.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.username}</p>
            <textarea
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What's happening?"
              rows={5}
              maxLength={POST_MAX_LENGTH}
              className="mt-4 w-full resize-none border-none bg-transparent text-lg outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <span aria-live="polite" className={`whitespace-nowrap text-sm tabular-nums ${text.length >= POST_MAX_LENGTH ? 'text-red-500' : text.length >= 300 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>{text.length}/{POST_MAX_LENGTH}</span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-full px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60">Cancel</button>
            <button onClick={submit} disabled={!text.trim() || isSubmitting || (initialText !== '' && text.trim() === initialText.trim())} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting ? (submitLabel === 'Save' ? 'Saving...' : 'Posting...') : submitLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ReplyModal({ post, onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const middleRef = useRef(null)
  const replyInputRef = useRef(null)

  const resizeReplyInput = (input) => {
    input.style.height = 'auto'
    const maxHeight = 160
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }

  useEffect(() => {
    const loadReplies = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'posts', post.id, 'replies'), orderBy('createdAt', 'asc')))
        const loadedReplies = await Promise.all(snapshot.docs.map(async (reply) => {
          const storedReply = { id: reply.id, ...reply.data() }
          const currentProfile = await loadUserProfile(storedReply.uid)
          return currentProfile
            ? {
                ...storedReply,
                name: currentProfile.name ?? storedReply.name,
                username: currentProfile.username ?? storedReply.username,
                photoURL: currentProfile.photoURL ?? storedReply.photoURL,
              }
            : storedReply
        }))
        setReplies(loadedReplies)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load replies.')
      } finally {
        setLoading(false)
      }
    }
    loadReplies()
  }, [post.id])

  const submit = async () => {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const reply = await onSubmit(post, text.trim())
      setReplies((current) => [...current, reply])
      setText('')
      if (replyInputRef.current) {
        replyInputRef.current.style.height = '44px'
        replyInputRef.current.style.overflowY = 'hidden'
        replyInputRef.current.blur()
      }
      requestAnimationFrame(() => middleRef.current?.scrollTo({ top: middleRef.current.scrollHeight, behavior: 'smooth' }))
    } catch (submitError) {
      setError(submitError.message || 'Unable to save your reply.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
      <section className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between p-5">
          <h2 className="text-xl font-extrabold">Reply</h2>
          <button onClick={onClose} className="text-2xl text-gray-500" aria-label="Close">×</button>
        </div>
        <div ref={middleRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5">
          <article className="border-b border-gray-200 pb-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Avatar name={post.name} photoURL={post.photoURL} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{post.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{post.username}</p>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px]">{post.text}</p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{formatPostDate(post.createdAt)}{post.editedAt && ' · edited'}</p>
          </article>
          <div>
            {loading && <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading replies...</p>}
            {!loading && replies.length === 0 && <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No replies yet.</p>}
            {replies.map((reply, index) => (
              <div className={`flex gap-3 py-4 ${index < replies.length - 1 ? 'border-b border-gray-200 dark:border-gray-800' : ''}`} key={reply.id}>
                <div className="[&>*]:h-9 [&>*]:w-9">
                  <Avatar name={reply.name} photoURL={reply.photoURL} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{reply.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{reply.username?.startsWith('@') ? reply.username : `@${reply.username || ''}`}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{reply.text}</p>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{formatPostDate(reply.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <textarea ref={replyInputRef} value={text} onChange={(event) => { setText(event.target.value); resizeReplyInput(event.target) }} placeholder="Write a reply..." rows={1} maxLength={REPLY_MAX_LENGTH} className="thin-scrollbar w-full resize-none overflow-y-hidden rounded-xl border border-gray-200 bg-white p-3 pr-2 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500" />
          <div className="mt-3 flex items-center justify-between">
            <span aria-live="polite" className={`whitespace-nowrap text-sm tabular-nums ${text.length >= REPLY_MAX_LENGTH ? 'text-red-500' : text.length >= 300 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>{text.length}/{REPLY_MAX_LENGTH}</span>
            <button onClick={submit} disabled={!text.trim() || isSubmitting} className="whitespace-nowrap rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{isSubmitting ? 'Replying...' : 'Reply'}</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function LikesModal({ post, likesCount, onClose }) {
  const [likes, setLikes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const displayedCount = typeof likesCount === 'number' ? likesCount : likes.length

  useEffect(() => {
    const loadLikes = async () => {
      try {
        const snapshot = await getDocs(query(
          collection(db, 'posts', post.id, 'likes'),
          orderBy('createdAt', 'desc'),
          limit(50),
        ))
        const loadedLikes = await Promise.all(snapshot.docs.map(async (likeDocument) => {
          const like = { id: likeDocument.id, ...likeDocument.data() }
          if (!like.uid) return { ...like, name: 'Unknown user', username: '' }

          const currentProfile = await loadUserProfile(like.uid)
          if (!currentProfile) return { ...like, name: like.name || 'Unknown user', username: like.username || '' }
          return {
            ...like,
            name: currentProfile.name ?? like.name ?? 'Unknown user',
            username: currentProfile.username ?? like.username ?? '',
            photoURL: currentProfile.photoURL ?? like.photoURL,
          }
        }))
        setLikes(loadedLikes)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load likes.')
      } finally {
        setLoading(false)
      }
    }

    loadLikes()
  }, [post.id])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
      <section className="thin-scrollbar max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Liked by <span className="text-base font-normal text-gray-500 dark:text-gray-400">· {displayedCount}</span></h2>
          <button onClick={onClose} className="text-2xl text-gray-500" aria-label="Close">×</button>
        </div>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && likes.length === 0 && <p className="text-sm text-gray-500">No likes yet</p>}
        {!loading && !error && likes.map((like) => (
          <div className="flex items-center gap-3 border-b border-gray-200 py-3 dark:border-gray-800" key={like.id}>
            <Avatar name={like.name} photoURL={like.photoURL} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{like.name}</p>
              {like.username && <p className="truncate text-sm text-gray-500">{like.username}</p>}
            </div>
          </div>
        ))}
        {!loading && !error && displayedCount > 50 && <p className="pt-3 text-center text-xs text-gray-500 dark:text-gray-400">Showing the first 50 likes</p>}
      </section>
    </div>
  )
}

function DeletePostModal({ onClose, onConfirm }) {
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the post.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
        <h2 className="text-xl font-extrabold">Delete this post?</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This also removes its replies and likes. This can't be undone.</p>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={deleting} className="rounded-full px-5 py-2 text-sm font-bold text-gray-600 dark:text-gray-400">Cancel</button>
          <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </section>
    </div>
  )
}

function HomeScreen() {
  const { profile, loading: authLoading, profileError } = useAuth()
  const profileUid = profile?.uid
  const [posts, setPosts] = useState([])
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [lastDocument, setLastDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [replyPost, setReplyPost] = useState(null)
  const [likesPost, setLikesPost] = useState(null)
  const [openMenuPostId, setOpenMenuPostId] = useState(null)
  const [editPost, setEditPost] = useState(null)
  const [deletePost, setDeletePost] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const loadMoreRef = useRef(null)
  const loadingRef = useRef(false)

  const loadPosts = useCallback(async (reset = false) => {
    if (loadingRef.current || (!hasMore && !reset)) return
    loadingRef.current = true
    setLoading(true)
    setError('')
    try {
      const constraints = [collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]
      if (!reset && lastDocument) constraints.push(startAfter(lastDocument))
      const snapshot = await getDocs(query(...constraints))
      const nextPosts = snapshot.docs.map((post) => ({ id: post.id, ...post.data() }))
      setPosts((current) => {
        const existing = new Set(reset ? [] : current.map((post) => post.id))
        return [...(reset ? [] : current), ...nextPosts.filter((post) => !existing.has(post.id))]
      })
      setLastDocument(snapshot.docs.at(-1) || null)
      setHasMore(snapshot.docs.length === PAGE_SIZE)
      const likes = await Promise.all(nextPosts.map(async (post) => {
        if (!profileUid) return [post.id, false]
        const likeSnapshot = await getDoc(doc(db, 'posts', post.id, 'likes', profileUid))
        return [post.id, likeSnapshot.exists()]
      }))
      setLikedPosts((current) => new Set([...current, ...likes.filter(([, liked]) => liked).map(([id]) => id)]))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load posts.')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore, lastDocument, profileUid])

  useEffect(() => {
    if (!profileUid) return undefined
    const timer = setTimeout(() => loadPosts(true), 0)
    return () => clearTimeout(timer)
  }, [profileUid, loadPosts])

  useEffect(() => {
    if (!authLoading && !profileUid) setLoading(false)
  }, [authLoading, profileUid])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadPosts()
    }, { rootMargin: '500px' })
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadPosts])

  useEffect(() => {
    const scrollContainer = document.querySelector('.main-content')
    const handleScroll = () => setShowScrollTop((scrollContainer?.scrollTop || 0) > 420)
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => scrollContainer?.removeEventListener('scroll', handleScroll)
  }, [])

  const createPost = async (text) => {
    if (!profileUid) throw new Error('You must be logged in to post.')
    const postReference = doc(collection(db, 'posts'))
    const post = {
      uid: profile.uid,
      name: profile.name,
      username: profile.username,
      photoURL: profile.photoURL || '',
      text,
      createdAt: serverTimestamp(),
      likes: 0,
      repliesCount: 0,
    }
    await runTransaction(db, async (transaction) => {
      transaction.set(postReference, post)
    })
    setPosts((current) => [{ id: postReference.id, ...post, createdAt: { toDate: () => new Date() } }, ...current])
  }

  const toggleLike = async (post) => {
    if (!profileUid) return setError('Please log in to like posts.')
    const wasLiked = likedPosts.has(post.id)
    try {
      await toggleSharedLike('posts', post.id, profile)
      setLikedPosts((current) => {
        const next = new Set(current)
        wasLiked ? next.delete(post.id) : next.add(post.id)
        return next
      })
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: Math.max(0, (item.likes || 0) + (wasLiked ? -1 : 1)) } : item))
    } catch (likeError) {
      setError(likeError.message || 'Unable to update like.')
    }
  }

  const createReply = async (post, text) => {
    if (!profileUid) throw new Error('You must be logged in to reply.')
    const reply = await addSharedReply('posts', post.id, profile, text)
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, repliesCount: (item.repliesCount || 0) + 1 } : item))
    return reply
  }

  useEffect(() => {
    if (!openMenuPostId) return undefined
    const closeMenu = (event) => {
      if (!event.target.closest('[data-post-menu]')) setOpenMenuPostId(null)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenuPostId(null)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenuPostId])

  const editPostText = async (text) => {
    await updateDoc(doc(db, 'posts', editPost.id), { text, editedAt: serverTimestamp() })
    setPosts((current) => current.map((post) => post.id === editPost.id ? { ...post, text, editedAt: { toDate: () => new Date() } } : post))
    setEditPost(null)
  }

  const deletePostAndChildren = async () => {
    const paths = ['replies', 'likes']
    for (const childCollection of paths) {
      const snapshot = await getDocs(collection(db, 'posts', deletePost.id, childCollection))
      for (let index = 0; index < snapshot.docs.length; index += 400) {
        const batch = writeBatch(db)
        snapshot.docs.slice(index, index + 400).forEach((child) => batch.delete(child.ref))
        await batch.commit()
      }
    }
    await deleteDoc(doc(db, 'posts', deletePost.id))
    setPosts((current) => current.filter((post) => post.id !== deletePost.id))
  }

  const feedError = profileError || error

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <main className="min-h-screen w-full min-w-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Home</h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your community feed</p>
          </header>
          <section aria-label="Community posts" role="status">
            <span className="sr-only">Loading posts</span>
            {Array.from({ length: 5 }, (_, index) => <PostSkeleton key={index} index={index} />)}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full">
        <main className="min-h-screen w-full min-w-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Home</h1>
          </header>
          {feedError && <p className="border-b border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">{feedError} <button type="button" onClick={() => loadPosts(true)} className="ml-2 font-bold underline">Retry</button></p>}
          <section aria-label="Community posts" role="status">
            {loading && <span className="sr-only">Loading posts</span>}
            {loading && posts.length === 0 && Array.from({ length: 5 }, (_, index) => <PostSkeleton key={index} index={index} />)}
            {posts.map((post) => {
              const isLiked = likedPosts.has(post.id)
              return (
                <article key={post.id} className="flex gap-3 border-b border-gray-200 p-5 transition hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/60">
                  <Avatar name={post.name} photoURL={post.photoURL} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-bold">{post.name}</span>
                      <span className="truncate text-sm text-gray-500 dark:text-gray-400">{post.username}</span>
                      <span className="text-gray-400">·</span>
                      <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{formatPostDate(post.createdAt)}{post.editedAt && ' · edited'}</span>
                      {profileUid === post.uid && (
                        <div className="relative ml-auto" data-post-menu>
                          <button
                            type="button"
                            onClick={() => setOpenMenuPostId((current) => current === post.id ? null : post.id)}
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            aria-label="Post options"
                            aria-haspopup="menu"
                            aria-expanded={openMenuPostId === post.id}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                          {openMenuPostId === post.id && (
                            <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-32 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                              <button type="button" role="menuitem" onClick={() => { setOpenMenuPostId(null); setEditPost(post) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60"><Pencil size={15} />Edit</button>
                              <button type="button" role="menuitem" onClick={() => { setOpenMenuPostId(null); setDeletePost(post) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={15} />Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.text}</p>
                    <div className="mt-4 flex max-w-[180px] items-center justify-between text-gray-500 dark:text-gray-400">
                      <div className={`flex items-center gap-1 text-sm ${isLiked ? 'text-pink-600' : 'text-gray-500 dark:text-gray-400'}`}>
                        <button onClick={() => toggleLike(post)} className="group hover:text-pink-600" aria-label={isLiked ? 'Unlike post' : 'Like post'}>
                          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                        {post.likes > 0 && (
                          <button onClick={() => setLikesPost(post)} className="hover:text-pink-600" aria-label="View likes">
                            {post.likes}
                          </button>
                        )}
                      </div>
                      <button onClick={() => setReplyPost(post)} className="group flex items-center gap-2 text-sm hover:text-blue-600"><MessageCircle size={18} /><span>{post.repliesCount || 0}</span></button>
                    </div>
                  </div>
                </article>
              )
            })}
            {!loading && posts.length === 0 && (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <MessageCircle size={38} className="mb-4 text-blue-600" />
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">No posts yet</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Be the one who posts! Share something with the AlonzoTech community and start the conversation.
                </p>
              </div>
            )}
            {loading && posts.length > 0 && Array.from({ length: 2 }, (_, index) => <PostSkeleton key={`loading-${index}`} index={index + posts.length} />)}
            <div ref={loadMoreRef} className="h-10" />
          </section>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 z-30 flex w-full items-center justify-around border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 lg:hidden">
        <Home size={23} className="text-blue-600" /><Search size={23} className="text-gray-500 dark:text-gray-400" /><Bell size={23} className="text-gray-500 dark:text-gray-400" /><Mail size={23} className="text-gray-500 dark:text-gray-400" /><User size={23} className="text-gray-500 dark:text-gray-400" />
      </nav>
      <div className="feed-floating-actions">
        <button
          onClick={() => document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`feed-scroll-top border border-gray-200 bg-white text-gray-700 transition duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 motion-reduce:transition-none ${showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
          aria-label="Scroll to top"
          aria-hidden={!showScrollTop}
          tabIndex={showScrollTop ? undefined : -1}
        >
          <ArrowUp size={22} />
        </button>
        <button onClick={() => setShowCreatePost(true)} className="feed-create-post" aria-label="Create a post">
          <Plus size={22} />
        </button>
      </div>
      {showCreatePost && <CreatePostModal profile={profile} onClose={() => setShowCreatePost(false)} onSubmit={createPost} />}
      {editPost && <CreatePostModal profile={profile} initialText={editPost.text} title="Edit post" submitLabel="Save" onClose={() => setEditPost(null)} onSubmit={editPostText} />}
      {deletePost && <DeletePostModal onClose={() => setDeletePost(null)} onConfirm={deletePostAndChildren} />}
      {replyPost && <ReplyModal post={replyPost} onClose={() => setReplyPost(null)} onSubmit={createReply} />}
      {likesPost && <SharedLikesModal parentCollection="posts" parentId={likesPost.id} likesCount={typeof likesPost.likes === 'number' ? likesPost.likes : undefined} onClose={() => setLikesPost(null)} />}
    </div>
  )
}

export default HomeScreen
