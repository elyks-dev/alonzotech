import { useState } from 'react'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function SettingsScreen() {
  const navigate = useNavigate()
  const { profile, signOutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const changePassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setError('New passwords do not match.')
    setSaving(true)
    try {
      const credential = EmailAuthProvider.credential(profile.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password updated successfully.')
    } catch (passwordError) {
      const messages = {
        'auth/wrong-password': 'The current password is incorrect.',
        'auth/invalid-credential': 'The current password is incorrect.',
        'auth/weak-password': 'Choose a stronger password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/requires-recent-login': 'Please log in again before changing your password.',
      }
      setError(messages[passwordError.code] || 'Unable to update your password.')
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await signOutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
        <button type="button" onClick={() => navigate('/account')} aria-label="Back to account" className="text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Settings</h1>
      </header>
      <div className="mx-auto max-w-2xl space-y-8 p-5">
        <section>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Preferences</h2>
          <button type="button" role="switch" aria-checked={theme === 'dark'} onClick={toggleTheme} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-gray-200 p-4 text-left dark:border-gray-800">
            <span className="text-gray-900 dark:text-gray-100">{theme === 'dark' ? 'Night mode' : 'Day mode'} <span className="block text-sm text-gray-500 dark:text-gray-400">Use {theme === 'dark' ? 'dark' : 'light'} colors</span></span>
            {theme === 'dark' ? <Moon /> : <Sun />}
          </button>
        </section>
        <section>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Password</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-3">
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" required className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900" />
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" required className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900" />
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" required className="w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900" />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            <button type="submit" disabled={saving} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Update password'}</button>
          </form>
        </section>
        <button type="button" onClick={logout} className="rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-600 dark:border-red-900">Logout</button>
      </div>
    </div>
  )
}

export default SettingsScreen
