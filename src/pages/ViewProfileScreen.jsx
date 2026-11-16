import { useEffect, useState } from 'react'
import { ArrowLeft, FileText, MessageCircle } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfilePostsTab from '../components/profile/ProfilePostsTab'
import ProfileArticlesTab from '../components/profile/ProfileArticlesTab'

function ProfileLoading() {
  return <div className="p-5 motion-safe:animate-pulse"><div className="flex items-center gap-4 border-b border-gray-200 pb-5 dark:border-gray-800"><div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-800" /><div className="flex-1 space-y-3"><div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-800" /></div></div><div className="mt-5 h-16 rounded bg-gray-200 dark:bg-gray-800" /><div className="mt-5 h-24 rounded bg-gray-200 dark:bg-gray-800" /></div>
}

export default function ViewProfileScreen() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('posts')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    setProfile(null)
    setError('')
    setLoading(true)
    setTab('posts')
    document.querySelector('.main-content')?.scrollTo({ top: 0 })
    if (!user || !uid) {
      setLoading(false)
      return undefined
    }
    let active = true
    getDoc(doc(db, 'users', uid)).then((snapshot) => {
      if (!active) return
      if (!snapshot.exists()) setError('User not found')
      else {
        const data = snapshot.data()
        setProfile({ uid, name: data.name || 'AlonzoTech user', username: data.username || '', photoURL: data.photoURL || '' })
      }
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Unable to load profile.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [retryKey, uid, user])

  if (authLoading) return <ProfileLoading />
  if (!user) return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-5 text-center"><p className="text-xl font-bold">Log in to view profiles</p><div className="flex gap-3"><Link to="/login" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white">Log in</Link><button type="button" onClick={() => navigate('/')} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-bold dark:border-gray-700">Back</button></div></div>
  if (uid === user.uid) return <Navigate to="/account" replace />
  if (loading) return <ProfileLoading />
  if (error) return <div className="p-5"><p className="text-xl font-bold">{error === 'User not found' ? 'User not found' : 'Unable to load profile'}</p>{error !== 'User not found' && <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="mt-3 font-bold text-blue-600 underline">Retry</button>}{error === 'User not found' && <Link to="/" className="mt-3 inline-block text-blue-600">Back home</Link>}</div>
  if (!profile) return null

  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate('/')
  return <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
      <button type="button" onClick={goBack} aria-label="Go back" className="rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><ArrowLeft size={21} /></button>
      <h1 className="truncate text-xl font-extrabold">{profile.name}</h1>
    </header>
    <ProfileHeader profile={profile} uid={uid} />
    <div className="flex border-b border-gray-200 dark:border-gray-800">
      <button type="button" onClick={() => setTab('posts')} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold ${tab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><MessageCircle size={17} /> Posts</button>
      <button type="button" onClick={() => setTab('articles')} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold ${tab === 'articles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><FileText size={17} /> Articles</button>
    </div>
    {tab === 'posts' && <ProfilePostsTab profile={profile} uid={uid} />}
    {tab === 'articles' && <ProfileArticlesTab profile={profile} uid={uid} active />}
  </div>
}
