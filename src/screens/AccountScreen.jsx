import { useCallback, useEffect, useState } from 'react'
import { FileText, ImagePlus, MessageCircle, Settings, X } from 'lucide-react'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Avatar } from './HomeScreen'
import { ArticleCard, ArticleSkeleton } from './ArticlesScreen'
import { uploadImage } from '../services/cloudinary'
import { syncProfileEverywhere } from '../services/profileSync'
import ImageLightbox from '../components/ImageLightbox'

function formatPostDate(timestamp) {
  if (!timestamp?.toDate) return 'Just now'
  return timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function PostSkeleton() {
  return <div className="flex gap-3 border-b border-gray-200 p-5 motion-safe:animate-pulse dark:border-gray-800"><div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-800" /><div className="flex-1 space-y-3"><div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" /></div></div>
}

function ProfileModal({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile.name)
  const [username, setUsername] = useState(profile.username.replace(/^@/, ''))
  const [photo, setPhoto] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedChanges, setSavedChanges] = useState(null)

  const runSync = async (currentProfile) => {
    setStatus('Updating your old posts...')
    const updatedCount = await syncProfileEverywhere(profile.uid, currentProfile, () => setStatus('Updating your old posts...'))
    return updatedCount
  }

  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    const cleanName = name.trim()
    const cleanUsername = username.trim().replace(/^@/, '')
    if (!cleanName) return setError('Name is required.')
    if (!cleanUsername || !/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) return setError('Username may contain only letters, numbers, underscores and dots.')
    setError('')
    setSaving(true)
    let profileSaved = false
    let nextProfile = profile
    try {
      const photoURL = photo ? await uploadImage(photo) : (removePhoto ? '' : profile.photoURL)
      const changes = {}
      if (cleanName !== profile.name) {
        changes.name = cleanName
      }
      if (cleanUsername !== profile.username.replace(/^@/, '')) {
        changes.username = `@${cleanUsername}`
      }
      if (photoURL !== profile.photoURL) {
        changes.photoURL = photoURL
      }
      nextProfile = { ...profile, ...changes }
      if (Object.keys(changes).length) await onSave(changes)
      profileSaved = true
      setSavedChanges(nextProfile)
      await runSync(nextProfile)
      onClose()
    } catch (saveError) {
      if (profileSaved) {
        setSavedChanges(nextProfile)
        setError(`Your profile was saved, but some old posts couldn't be updated. ${saveError.message}`)
      }
      else setError(saveError.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const retrySync = async () => {
    if (!savedChanges) return
    setError('')
    setSaving(true)
    try {
      await runSync(savedChanges)
      onClose()
    } catch (syncError) {
      setError(`Your profile was saved, but some old posts couldn't be updated. ${syncError.message}`)
    } finally {
      setSaving(false)
    }
  }

  const preview = photo ? URL.createObjectURL(photo) : (removePhoto ? '' : profile.photoURL)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20" onMouseDown={onClose}>
      <section className="thin-scrollbar max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 dark:text-gray-100" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Edit profile</h2><button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 dark:text-gray-400"><X /></button></div>
        <form onSubmit={save}>
          <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            {preview ? <div className="relative w-full"><img src={preview} alt="Profile preview" className="mx-auto h-36 w-36 rounded-full object-cover p-3" /><button type="button" onClick={() => { setPhoto(null); setRemovePhoto(true) }} className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-700 shadow" aria-label="Remove photo"><X size={18} /></button></div> : <div className="flex h-36 flex-col items-center justify-center gap-2 text-sm text-gray-500"><ImagePlus /><span>Choose a display picture</span></div>}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => { setPhoto(event.target.files?.[0] || null); setRemovePhoto(false) }} />
          </label>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required placeholder="Name" className="mt-4 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500" />
          <div className="mt-3 flex items-center rounded-xl border border-gray-200 dark:border-gray-800"><span className="pl-3 text-gray-500 dark:text-gray-400">@</span><input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={30} required placeholder="Username" className="w-full bg-transparent p-3 outline-none dark:placeholder:text-gray-500" /></div>
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">{profile.email} · Email cannot be changed here.</p>
          {status && <p className="mt-3 text-sm text-blue-600">{status}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800"><button type="button" onClick={onClose} className="rounded-full px-5 py-2 text-sm font-bold text-gray-600">Cancel</button><button type="submit" disabled={saving} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save profile'}</button>{savedChanges && error && <button type="button" onClick={retrySync} disabled={saving} className="rounded-full border border-blue-200 px-4 py-2 text-sm font-bold text-blue-600">Retry</button>}</div>
        </form>
      </section>
    </div>
  )
}

function AccountScreen() {
  const { profile, updateProfile } = useAuth()
  const [tab, setTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [articles, setArticles] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [postsError, setPostsError] = useState('')
  const [articlesError, setArticlesError] = useState('')
  const [articlesLoaded, setArticlesLoaded] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileImage, setShowProfileImage] = useState(false)
  const [profileImageFailed, setProfileImageFailed] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true)
    setPostsError('')
    try {
      const snapshot = await getDocs(query(collection(db, 'posts'), where('uid', '==', profile.uid)))
      setPosts(snapshot.docs.map((post) => ({ id: post.id, ...post.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
    } catch (loadError) {
      setPostsError(loadError.message || 'Unable to load posts.')
    } finally {
      setLoadingPosts(false)
    }
  }, [profile.uid])

  const loadArticles = useCallback(async () => {
    setLoadingArticles(true)
    setArticlesError('')
    try {
      const snapshot = await getDocs(query(collection(db, 'articles'), where('authorId', '==', profile.uid)))
      setArticles(snapshot.docs.map((article) => ({ id: article.id, ...article.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
      setArticlesLoaded(true)
    } catch (loadError) {
      setArticlesError(loadError.message || 'Unable to load articles.')
    } finally {
      setLoadingArticles(false)
    }
  }, [profile.uid])

  useEffect(() => { loadPosts() }, [loadPosts])
  useEffect(() => { if (tab === 'articles' && !articlesLoaded) loadArticles() }, [articlesLoaded, loadArticles, tab])

  const saveProfile = async (changes) => {
    await setDoc(doc(db, 'users', profile.uid), changes, { merge: true })
    updateProfile(changes)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90"><h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Account</h1><Link to="/settings" aria-label="Settings" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"><Settings size={21} /></Link></header>
      <section className="flex flex-wrap items-center gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
        {profile.photoURL && !profileImageFailed ? (
          <button type="button" onClick={() => setShowProfileImage(true)} aria-label="View profile picture" className="cursor-pointer rounded-full transition hover:ring-4 hover:ring-blue-100 dark:hover:ring-blue-900/40">
            <img src={profile.photoURL} alt="" onError={() => setProfileImageFailed(true)} className="h-24 w-24 rounded-full object-cover sm:h-32 sm:w-32" />
          </button>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 sm:h-32 sm:w-32">{profile.name.charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-extrabold text-gray-900 dark:text-gray-100">{profile.name}</h2><p className="truncate text-sm text-gray-500 dark:text-gray-400">{profile.username}</p><p className="truncate text-sm text-gray-500 dark:text-gray-400">{profile.email}</p></div>
        <button type="button" onClick={() => setShowProfileModal(true)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold dark:border-gray-800">Edit profile</button>
      </section>
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button type="button" onClick={() => setTab('posts')} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold ${tab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><MessageCircle size={17} /> Posts</button>
        <button type="button" onClick={() => setTab('articles')} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold ${tab === 'articles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><FileText size={17} /> Articles</button>
      </div>
      {tab === 'posts' && <section>{loadingPosts && Array.from({ length: 3 }, (_, index) => <PostSkeleton key={index} />)}{postsError && <p className="p-5 text-sm text-red-600 dark:text-red-400">{postsError} <button type="button" onClick={loadPosts} className="font-bold underline">Retry</button></p>}{!loadingPosts && !postsError && !posts.length && <p className="p-5 text-gray-500 dark:text-gray-400">No posts yet</p>}{posts.map((post) => <article key={post.id} className="flex gap-3 border-b border-gray-200 p-5 dark:border-gray-800"><Avatar name={post.name} photoURL={post.photoURL} /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{post.name} <span className="font-normal text-gray-500 dark:text-gray-400">{post.username}</span> <span className="font-normal text-gray-400">· {formatPostDate(post.createdAt)}{post.editedAt && ' · edited'}</span></p><p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.text}</p><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{post.likes || 0} likes · {post.repliesCount || 0} replies</p></div></article>)}</section>}
      {tab === 'articles' && <section className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">{loadingArticles && Array.from({ length: 3 }, (_, index) => <ArticleSkeleton key={index} />)}{articlesError && <p className="col-span-full text-sm text-red-600">{articlesError} <button type="button" onClick={loadArticles} className="font-bold underline">Retry</button></p>}{!loadingArticles && !articlesError && !articles.length && <p className="col-span-full text-gray-500">No articles yet</p>}{articles.map((article) => <ArticleCard key={article.id} article={article} onImageError={() => setArticles((current) => current.map((item) => item.id === article.id ? { ...item, imageFailed: true } : item))} />)}</section>}
      {showProfileModal && <ProfileModal profile={profile} onClose={() => setShowProfileModal(false)} onSave={saveProfile} />}
      {showProfileImage && <ImageLightbox src={profile.photoURL} alt={`${profile.name}'s profile picture`} onClose={() => setShowProfileImage(false)} />}
    </div>
  )
}

export default AccountScreen
