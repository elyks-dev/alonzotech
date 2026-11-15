import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, ImagePlus, MessageCircle, Plus, X } from 'lucide-react'
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, startAfter } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../services/cloudinary'

const PAGE_SIZE = 12

export function ArticleSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white motion-safe:animate-pulse dark:border-gray-800 dark:bg-gray-900">
      <div className="aspect-[16/10] bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  )
}

export function ArticleCard({ article, onImageError }) {
  return (
    <Link to={`/articles/${article.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
      {article.imageFailed ? (
        <div className="flex aspect-[16/10] items-center justify-center bg-gray-100 text-sm text-gray-400 dark:bg-gray-800 dark:text-gray-500">Image unavailable</div>
      ) : (
        <img src={article.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" onError={onImageError} />
      )}
      <div className="p-4">
        <h2 className="truncate text-lg font-extrabold text-gray-900 dark:text-gray-100">{article.title}</h2>
        <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{article.authorName}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400"><span className="flex items-center gap-1"><Heart size={14} />{article.likes || 0}</span><span className="flex items-center gap-1"><MessageCircle size={14} />{article.repliesCount || 0}</span></div>
      </div>
    </Link>
  )
}

export function ArticleFormModal({ profile, article, mode = 'create', onClose, onSubmit, onDelete }) {
  const [photo, setPhoto] = useState(null)
  const [title, setTitle] = useState(article?.title || '')
  const [description, setDescription] = useState(article?.description || '')
  const [link, setLink] = useState(article?.link || '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    if (!photo && !article?.imageUrl) return setError('Please select a photo.')
    if (!title.trim()) return setError('Please enter a title.')
    let normalizedLink = link.trim()
    if (normalizedLink && !/^[a-z][a-z\d+\-.]*:\/\//i.test(normalizedLink)) normalizedLink = `https://${normalizedLink}`
    if (normalizedLink && !/^https?:\/\//i.test(normalizedLink)) return setError('Link must use http or https.')
    setError('')
    setIsSubmitting(true)
    try {
      const imageUrl = photo ? await uploadImage(photo) : article.imageUrl
      await onSubmit({ title: title.trim(), description: description.trim(), imageUrl, link: normalizedLink })
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to publish the article.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
      <section className="thin-scrollbar max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{mode === 'edit' ? 'Edit article' : 'Create article'}</h2>
          <button type="button" onClick={onClose} className="text-gray-500" aria-label="Close"><X /></button>
        </div>
        <form onSubmit={submit}>
          <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            {photo ? (
              <div className="relative w-full">
                <img src={URL.createObjectURL(photo)} alt="Preview" className="max-h-64 w-full object-cover" />
                <button type="button" onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-700 shadow dark:bg-gray-800 dark:text-gray-100" aria-label="Remove photo"><X size={18} /></button>
              </div>
            ) : article?.imageUrl ? (
              <img src={article.imageUrl} alt="Current article" className="max-h-64 w-full object-cover" />
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-2 text-sm text-gray-500"><ImagePlus /><span>Choose a photo</span></div>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
          </label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder="Title" className="mt-4 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Description (optional)" rows={5} className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500" />
          <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Link (optional)" className="mt-3 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500" />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60">Cancel</button>
            {mode === 'edit' && <button type="button" onClick={onDelete} disabled={isSubmitting} className="rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-600 dark:border-red-900">Delete</button>}
            <button type="submit" disabled={(!photo && !article?.imageUrl) || !title.trim() || isSubmitting} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isSubmitting ? (mode === 'edit' ? 'Saving...' : 'Publishing...') : (mode === 'edit' ? 'Save' : 'Publish')}</button>
          </div>
        </form>
        <p className="sr-only">Publishing as {profile.name}</p>
      </section>
    </div>
  )
}

function ArticlesScreen() {
  const { user, profile } = useAuth()
  const [articles, setArticles] = useState([])
  const [lastDocument, setLastDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showModal, setShowModal] = useState(false)
  const loadMoreRef = useRef(null)
  const loadingRef = useRef(false)

  const loadArticles = useCallback(async (reset = false) => {
    if (loadingRef.current || (!hasMore && !reset)) return
    loadingRef.current = true
    setLoading(true)
    setError('')
    try {
      const constraints = [collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]
      if (!reset && lastDocument) constraints.push(startAfter(lastDocument))
      const snapshot = await getDocs(query(...constraints))
      const nextArticles = snapshot.docs.map((article) => ({ id: article.id, ...article.data() }))
      setArticles((current) => [...(reset ? [] : current), ...nextArticles.filter((article) => !(reset ? [] : current).some((item) => item.id === article.id))])
      setLastDocument(snapshot.docs.at(-1) || null)
      setHasMore(snapshot.docs.length === PAGE_SIZE)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load articles.')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore, lastDocument])

  useEffect(() => {
    loadArticles(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadArticles()
    }, { rootMargin: '500px' })
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadArticles])

  const createArticle = async (article) => {
    if (!profile?.uid) throw new Error('You must be logged in to publish an article.')
    const reference = await addDoc(collection(db, 'articles'), {
      ...article,
      authorId: profile.uid,
      authorName: profile.name,
      authorUsername: profile.username,
      authorPhotoURL: profile.photoURL,
      createdAt: serverTimestamp(),
      likes: 0,
      repliesCount: 0,
    })
    setArticles((current) => [{ id: reference.id, ...article, authorName: profile.name, createdAt: { toDate: () => new Date() } }, ...current])
  }

  const openCreate = () => {
    if (!user) return setNotice('Please log in to publish an article.')
    setNotice('')
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Articles</h1>
      </header>
      {notice && <p className="border-b border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">{notice}</p>}
      {error && <div className="border-b border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">{error} <button type="button" onClick={() => loadArticles(true)} className="ml-2 font-bold underline">Retry</button></div>}
      <section className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Articles">
        {loading && articles.length === 0 && Array.from({ length: 4 }, (_, index) => <ArticleSkeleton key={index} />)}
        {articles.map((article) => <ArticleCard key={article.id} article={article} onImageError={() => setArticles((current) => current.map((item) => item.id === article.id ? { ...item, imageFailed: true } : item))} />)}
        {loading && articles.length > 0 && <><ArticleSkeleton /><ArticleSkeleton /></>}
      </section>
      {!loading && !error && articles.length === 0 && <p className="p-5 text-gray-500">No articles yet</p>}
      <div ref={loadMoreRef} className="h-8" />
      <div className="feed-floating-actions">
        <button type="button" onClick={openCreate} className="feed-create-post" aria-label="Create an article"><Plus size={27} /></button>
      </div>
      {showModal && <ArticleFormModal profile={profile} onClose={() => setShowModal(false)} onSubmit={createArticle} />}
    </div>
  )
}

export default ArticlesScreen
