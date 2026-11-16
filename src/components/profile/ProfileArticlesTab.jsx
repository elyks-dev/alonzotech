import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { ArticleCard, ArticleSkeleton } from '../../screens/ArticlesScreen'
import { db } from '../../lib/firebase'

export default function ProfileArticlesTab({ uid, active = false }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const snapshot = await getDocs(query(collection(db, 'articles'), where('authorId', '==', uid)))
      setArticles(snapshot.docs.map((article) => ({ id: article.id, ...article.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
      setLoaded(true)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load articles.')
    } finally {
      setLoading(false)
    }
  }, [uid])
  useEffect(() => { if (active && !loaded) loadArticles() }, [active, loaded, loadArticles])
  return <section className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">{loading && Array.from({ length: 3 }, (_, index) => <ArticleSkeleton key={index} />)}{error && <p className="col-span-full text-sm text-red-600">{error} <button type="button" onClick={loadArticles} className="font-bold underline">Retry</button></p>}{!loading && !error && loaded && !articles.length && <p className="col-span-full text-gray-500">No articles yet</p>}{articles.map((article) => <ArticleCard key={article.id} article={article} onImageError={() => setArticles((current) => current.map((item) => item.id === article.id ? { ...item, imageFailed: true } : item))} />)}</section>
}
