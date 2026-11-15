import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import LikesModal from '../components/LikesModal'
import ImageLightbox from '../components/ImageLightbox'
import { ArticleFormModal } from '../screens/ArticlesScreen'
import { addReply, deleteAllEngagement, loadReplies, toggleLike } from '../services/engagement'

const REPLY_MAX_LENGTH = 350

function formatDate(timestamp) {
  if (!timestamp?.toDate) return 'Just now'
  return timestamp.toDate().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function ViewArticleScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [article, setArticle] = useState(null)
  const [replies, setReplies] = useState([])
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [repliesLoading, setRepliesLoading] = useState(true)
  const [error, setError] = useState('')
  const [repliesError, setRepliesError] = useState('')
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [showLikes, setShowLikes] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const replyInputRef = useRef(null)
  const repliesRef = useRef(null)

  const loadArticleReplies = async () => {
    try {
      setRepliesError('')
      setReplies(await loadReplies('articles', id))
    } catch (loadError) {
      setRepliesError(loadError.message || 'Unable to load replies.')
    } finally {
      setRepliesLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'articles', id)),
      profile?.uid ? getDoc(doc(db, 'articles', id, 'likes', profile.uid)) : Promise.resolve(null),
    ]).then(([snapshot, likeSnapshot]) => {
      if (snapshot.exists()) setArticle({ id: snapshot.id, ...snapshot.data() })
      if (likeSnapshot?.exists()) setLiked(true)
    }).catch((loadError) => setError(loadError.message || 'Unable to load article.')).finally(() => setLoading(false))
    loadArticleReplies()
  }, [id, profile?.uid])

  useEffect(() => {
    const scrollContainer = document.querySelector('.main-content')
    const handleScroll = () => setShowScrollTop((scrollContainer?.scrollTop || 0) > 420)
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => scrollContainer?.removeEventListener('scroll', handleScroll)
  }, [])

  const resizeInput = (input) => {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`
    input.style.overflowY = input.scrollHeight > 160 ? 'auto' : 'hidden'
  }

  const submitReply = async () => {
    if (!profile) return setRepliesError('Please log in to reply.')
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const reply = await addReply('articles', id, profile, text.trim())
      setReplies((current) => [...current, reply])
      setArticle((current) => ({ ...current, repliesCount: (current.repliesCount || 0) + 1 }))
      setText('')
      if (replyInputRef.current) {
        replyInputRef.current.style.height = '44px'
        replyInputRef.current.style.overflowY = 'hidden'
        replyInputRef.current.blur()
      }
      requestAnimationFrame(() => repliesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
    } catch (submitError) {
      setRepliesError(submitError.message || 'Unable to save your reply.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-5 motion-safe:animate-pulse"><div className="aspect-video rounded-2xl bg-gray-200 dark:bg-gray-800" /><div className="mt-5 h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-800" /><div className="mt-4 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" /></div>
  if (error) return <p className="p-5 text-red-600 dark:text-red-400">{error}</p>
  if (!article) return <div className="p-5"><p className="text-xl font-bold text-gray-900 dark:text-gray-100">Article not found</p><Link to="/articles" className="mt-3 inline-block text-blue-600">Back to articles</Link></div>

  const canEdit = profile?.uid === article.authorId
  const updateArticle = async (changes) => {
    const { title, description, imageUrl, link } = changes
    await updateDoc(doc(db, 'articles', id), { title, description, imageUrl, link, editedAt: serverTimestamp() })
    setArticle((current) => ({ ...current, ...changes, editedAt: { toDate: () => new Date() } }))
    setShowEdit(false)
  }
  const removeArticle = async () => {
    setDeleting(true)
    try {
      await deleteAllEngagement('articles', id)
      await deleteDoc(doc(db, 'articles', id))
      navigate('/articles')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the article.')
      setDeleting(false)
    }
  }
  const handleLike = async () => {
    if (!profile) return setError('Please log in to like articles.')
    const nextLiked = await toggleLike('articles', id, profile)
    setLiked(nextLiked)
    setArticle((current) => ({ ...current, likes: Math.max(0, (current.likes || 0) + (nextLiked ? 1 : -1)) }))
  }

  return (
    <article className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex h-[60px] items-center justify-between px-5">
        <button type="button" onClick={() => navigate('/articles')} className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"><ArrowLeft size={18} /> Back to articles</button>
        {canEdit && <button type="button" onClick={() => setShowEdit(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800/60"><Pencil size={15} /> Edit article</button>}
      </div>
      <div className="px-5 pb-12">
        {imageFailed ? <div className="mx-auto flex h-64 max-w-md items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">Image unavailable</div> : <button type="button" onClick={() => setShowImage(true)} aria-label="View image" className="mx-auto mt-6 block max-h-[360px] max-w-md cursor-zoom-in overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"><img src={article.imageUrl} alt="" className="max-h-[360px] max-w-full object-contain" onError={() => setImageFailed(true)} /></button>}
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">{article.title}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{article.authorName} <span className="mx-1">·</span> {formatDate(article.createdAt)}{article.editedAt && ' · edited'}</p>
        {article.description && <p className="mt-6 whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">{article.description}</p>}
        {article.link && <a href={article.link} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block break-all text-blue-600 underline">{new URL(article.link).hostname}</a>}
        <div className="mt-6 flex items-center gap-5 text-sm text-gray-500 dark:text-gray-400">
          <div className={`flex items-center gap-1 ${liked ? 'text-pink-600' : ''}`}><button type="button" onClick={handleLike} aria-label={liked ? 'Unlike article' : 'Like article'}><Heart size={19} fill={liked ? 'currentColor' : 'none'} /></button><button type="button" onClick={() => article.likes > 0 && setShowLikes(true)}>{article.likes || 0}</button></div>
          <span className="flex items-center gap-1"><MessageCircle size={19} />{article.repliesCount || 0}</span>
        </div>
        {canEdit && confirmDelete && <div className="mt-6"><div className="flex flex-wrap items-center gap-3"><span className="text-sm text-red-600">Delete this article? This can't be undone.</span><button type="button" disabled={deleting} onClick={removeArticle} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{deleting ? 'Deleting...' : 'Confirm'}</button><button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400">Cancel</button></div></div>}
        <section ref={repliesRef} className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
          <h2 className="text-xl font-extrabold">Replies <span className="text-base font-normal text-gray-500 dark:text-gray-400">· {article.repliesCount || 0}</span></h2>
          {profile ? <div className="mt-4 flex gap-3"><Avatar name={profile.name} photoURL={profile.photoURL} /><div className="min-w-0 flex-1"><textarea ref={replyInputRef} value={text} onChange={(event) => { setText(event.target.value); resizeInput(event.target) }} rows={1} maxLength={REPLY_MAX_LENGTH} placeholder="Write a reply..." className="thin-scrollbar w-full resize-none overflow-y-hidden rounded-xl border border-gray-200 bg-white p-3 pr-2 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500" /><div className="mt-3 flex items-center justify-between"><span className={`text-sm tabular-nums ${text.length >= 350 ? 'text-red-500' : text.length >= 300 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>{text.length}/350</span><button type="button" onClick={submitReply} disabled={!text.trim() || isSubmitting} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{isSubmitting ? 'Replying...' : 'Reply'}</button></div></div></div> : <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Log in to reply</p>}
          {repliesError && <p className="mt-3 text-sm text-red-600">{repliesError}</p>}
          {repliesLoading && <div className="mt-5 motion-safe:animate-pulse"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" /><div className="mt-3 h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-800" /></div>}
          {!repliesLoading && !replies.length && <p className="py-6 text-sm text-gray-500 dark:text-gray-400">No replies yet.</p>}
          {!repliesLoading && replies.map((reply, index) => <div key={reply.id} className={`flex gap-3 py-4 ${index < replies.length - 1 ? 'border-b border-gray-200 dark:border-gray-800' : ''}`}><Avatar name={reply.name} photoURL={reply.photoURL} className="h-9 w-9" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{reply.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{reply.username?.startsWith('@') ? reply.username : `@${reply.username || ''}`}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{reply.text}</p><p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{formatDate(reply.createdAt)}</p></div></div>)}
        </section>
      </div>
      <button type="button" onClick={() => document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top" aria-hidden={!showScrollTop} tabIndex={showScrollTop ? undefined : -1} className={`fixed bottom-6 right-6 z-30 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 motion-reduce:transition-none ${showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}><ArrowUp size={22} /></button>
      {showLikes && <LikesModal parentCollection="articles" parentId={id} likesCount={typeof article.likes === 'number' ? article.likes : undefined} onClose={() => setShowLikes(false)} />}
      {showEdit && <ArticleFormModal profile={profile} article={article} mode="edit" onClose={() => setShowEdit(false)} onSubmit={updateArticle} onDelete={() => { setShowEdit(false); setConfirmDelete(true) }} />}
      {showImage && <ImageLightbox src={article.imageUrl} alt={article.title} onClose={() => setShowImage(false)} />}
    </article>
  )
}

export default ViewArticleScreen
