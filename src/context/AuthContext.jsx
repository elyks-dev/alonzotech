import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

function profileFromUser(user, profile = {}) {
  const username = profile.username || user.email?.split('@')[0] || 'user'
  return {
    uid: user.uid,
    firstName: profile.firstName || user.displayName?.split(' ')[0] || '',
    lastName: profile.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
    name: profile.name || profile.displayName || user.displayName || 'AlonzoTech user',
    displayName: profile.displayName || profile.name || user.displayName || 'AlonzoTech user',
    email: profile.email || user.email || '',
    role: profile.role || 'user',
    photoURL: profile.photoURL || user.photoURL || '',
    username: username.startsWith('@') ? username : `@${username}`,
  }
}

function defaultProfileData(user) {
  const email = user.email || ''
  const emailLocalPart = email.split('@')[0] || 'user'
  const username = emailLocalPart.toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'user'
  return {
    name: user.displayName || emailLocalPart,
    username,
    email,
    photoURL: user.photoURL || '',
    role: 'user',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [profileStatus, setProfileStatus] = useState('signed-out')
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setLoading(true)
    setUser(currentUser)
    setProfileError('')

    if (!currentUser) {
      setProfile(null)
      setProfileStatus('signed-out')
      setLoading(false)
      return
    }

    try {
      const profileReference = doc(db, 'users', currentUser.uid)
      let profileSnapshot
      try {
        profileSnapshot = await getDoc(profileReference)
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        profileSnapshot = await getDoc(profileReference)
      }
      const defaults = defaultProfileData(currentUser)
      const existingProfile = profileSnapshot.exists() ? profileSnapshot.data() : {}
      const missingFields = Object.fromEntries(
        Object.entries(defaults).filter(([field]) => !Object.prototype.hasOwnProperty.call(existingProfile, field)),
      )

      if (!profileSnapshot.exists()) {
        await setDoc(profileReference, {
          ...defaults,
          uid: currentUser.uid,
          createdAt: serverTimestamp(),
        })
      } else if (Object.keys(missingFields).length) {
        await setDoc(profileReference, missingFields, { merge: true })
      }

      setProfile(profileFromUser(currentUser, { ...defaults, ...existingProfile, ...missingFields }))
      setProfileStatus(profileSnapshot.exists() ? 'retrieved' : 'repaired')
    } catch (error) {
      console.error('Failed to load user profile', {
        code: error.code,
        message: error.message,
      })
      setProfile(profileFromUser(currentUser))
      setProfileStatus(error.code === 'permission-denied' ? 'permission-denied' : 'error')
      setProfileError(
        error.code === 'permission-denied'
          ? 'Permission problem: your profile could not be loaded from Firestore.'
          : 'Connection problem: your profile could not be loaded from Firestore.',
      )
    } finally {
      setLoading(false)
    }
  }), [])

  const value = useMemo(() => ({
    user,
    profile,
    profileStatus,
    loading,
    profileError,
    signOutUser: () => signOut(auth),
    updateProfile: (changes) => setProfile((current) => ({
      ...current,
      ...changes,
      username: changes.username
        ? (changes.username.startsWith('@') ? changes.username : `@${changes.username}`)
        : current.username,
    })),
  }), [loading, profile, profileError, profileStatus, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
