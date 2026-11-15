import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'

function NewArticleImage({ article }) {
  const [imageFailed, setImageFailed] = useState(!article.imageUrl)

  if (imageFailed) return <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400 dark:bg-gray-800 dark:text-gray-500">No image</div>
  return <img src={article.imageUrl} alt="" onError={() => setImageFailed(true)} className="aspect-video w-full rounded-xl object-cover" />
}

function NewArticlesSkeleton() {
  return (
    <section className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <h2 className="px-4 py-3 text-lg font-extrabold">New articles</h2>
      <div className="px-4 motion-safe:animate-pulse">
        <div className="aspect-video w-full rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="mt-3 h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-3/5 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-3 h-3 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-4 flex justify-center gap-2 pb-4">
          <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </section>
  )
}

function NewArticlesCard() {
  const [articles, setArticles] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isHidden, setIsHidden] = useState(() => document.visibilityState === 'hidden')
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(5)))
        setArticles(snapshot.docs.map((article) => ({ id: article.id, ...article.data() })))
      } catch (error) {
        console.error('Unable to load new articles', error)
        setArticles([])
      }
    }
    loadArticles()
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setIsReducedMotion(mediaQuery.matches)
    updateMotionPreference()
    mediaQuery.addEventListener?.('change', updateMotionPreference)
    return () => mediaQuery.removeEventListener?.('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    const updateVisibility = () => setIsHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    if (!articles?.length || articles.length === 1 || isHovered || isFocused || isHidden || isReducedMotion) return undefined
    const timer = setInterval(() => setActiveIndex((current) => (current + 1) % articles.length), 5000)
    return () => clearInterval(timer)
  }, [articles, isHovered, isFocused, isHidden, isReducedMotion])

  if (articles === null) return <NewArticlesSkeleton />
  if (!articles.length) return null

  return (
    <section
      className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false) }}
    >
      <h2 className="px-4 py-3 text-lg font-extrabold">New articles</h2>
      <div className="relative h-[280px] px-4">
        {articles.map((article, index) => {
          const isActive = index === activeIndex
          return (
            <Link
              key={article.id}
              to={`/articles/${article.id}`}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={`absolute inset-x-4 top-0 rounded-xl transition-all duration-400 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:hover:bg-gray-800/60 motion-reduce:transition-none ${isActive ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'}`}
            >
              <NewArticleImage article={article} />
              <p className="mt-3 line-clamp-2 font-bold">{article.title}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{article.authorName}</p>
            </Link>
          )
        })}
      </div>
      {articles.length > 1 && (
        <div className="flex justify-center gap-2 pb-3">
          {articles.map((article, index) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show article ${index + 1}`}
              className={`h-2 w-2 rounded-full transition-colors motion-reduce:transition-none ${index === activeIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            />
          ))}
        </div>
      )}
      <Link to="/articles" className="block border-t border-gray-200 px-4 py-3 text-sm text-blue-600 hover:underline dark:border-gray-800 dark:text-blue-400">View all articles</Link>
    </section>
  )
}

function RightSidebar() {
  return (
    <aside className="right-sidebar hidden xl:block">
      <div className="right-sidebar-inner">
        <NewArticlesCard />

        <section className="w-full rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="text-lg font-extrabold">About AlonzoTech</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            A community for sharing thoughts, discussions, and ideas about
            technology and development.
          </p>
        </section>
      </div>
    </aside>
  )
}

export default RightSidebar
