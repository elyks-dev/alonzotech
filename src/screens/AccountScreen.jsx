import { useState } from 'react'
import { FileText, ImagePlus, MessageCircle, Settings, X } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../services/cloudinary'
import { syncProfileEverywhere } from '../services/profileSync'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfilePostsTab from '../components/profile/ProfilePostsTab'
import ProfileArticlesTab from '../components/profile/ProfileArticlesTab'

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
  const [showProfileModal, setShowProfileModal] = useState(false)

  const saveProfile = async (changes) => {
    await setDoc(doc(db, 'users', profile.uid), changes, { merge: true })
    updateProfile(changes)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90"><h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Profile</h1><Link to="/settings" aria-label="Settings" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"><Settings size={21} /></Link></header>
      <ProfileHeader profile={profile} uid={profile.uid} isOwn showEmail onEdit={() => setShowProfileModal(true)} />
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button type="button" onClick={() => setTab('posts')} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold ${tab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><MessageCircle size={17} /> Posts</button>
        <button type="button" onClick={() => setTab('articles')} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold ${tab === 'articles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}><FileText size={17} /> Articles</button>
      </div>
      {tab === 'posts' && <ProfilePostsTab profile={profile} isOwn uid={profile.uid} />}
      {tab === 'articles' && <ProfileArticlesTab profile={profile} isOwn uid={profile.uid} active />}
      {showProfileModal && <ProfileModal profile={profile} onClose={() => setShowProfileModal(false)} onSave={saveProfile} />}
    </div>
  )
}

export default AccountScreen
