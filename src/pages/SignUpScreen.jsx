import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
import { auth, db } from '../lib/firebase'
import ThemeToggleButton from '../components/ThemeToggleButton'

function SignUpScreen() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const { firstName, lastName, email, password, confirmPassword } = form
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete every field.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const displayName = `${firstName.trim()} ${lastName.trim()}`
      const username = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'user'
      await updateProfile(credential.user, { displayName })
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: displayName,
        displayName,
        email: credential.user.email,
        username,
        photoURL: '',
        role: 'user',
        createdAt: serverTimestamp(),
      }, { merge: true })
      await auth.signOut()
      setSuccess('Account created. Redirecting to login...')
      setTimeout(() => navigate('/login'), 700)
    } catch (submitError) {
      if (submitError.code === 'auth/email-already-in-use') setError('An account already exists for this email.')
      else if (submitError.code === 'auth/invalid-email') setError('Enter a valid email address.')
      else setError('Unable to create your account right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="auth-loading">Checking your session...</div>
  if (user && !submitting) return <Navigate to="/" replace />

  return (
    <main className="auth-page thin-scrollbar">
      <ThemeToggleButton />
      <form className="auth-card signup-card" onSubmit={handleSubmit}>
        <div className="auth-header">
          <img src={logo} alt="AlonzoTech Logo" className="auth-logo" />
          <p className="auth-eyebrow">AlonzoTech</p>
          <h1>Create your account</h1>
          <p className="auth-description">Join the AlonzoTech community.</p>
        </div>

        <div className="auth-row">
          <div><label className="auth-label" htmlFor="first-name">First Name</label><input id="first-name" className="auth-input" value={form.firstName} onChange={updateField('firstName')} autoComplete="given-name" /></div>
          <div><label className="auth-label" htmlFor="last-name">Last Name</label><input id="last-name" className="auth-input" value={form.lastName} onChange={updateField('lastName')} autoComplete="family-name" /></div>
        </div>
        <label className="auth-label" htmlFor="signup-email">Email</label>
        <input id="signup-email" className="auth-input" type="email" value={form.email} onChange={updateField('email')} autoComplete="email" />
        <div className="auth-row auth-password-row">
          <div><label className="auth-label" htmlFor="signup-password">Password</label><div className="password-input"><input id="signup-password" className="auth-input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField('password')} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="auth-label" htmlFor="confirm-password">Confirm Password</label><div className="password-input"><input id="confirm-password" className="auth-input" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={updateField('confirmPassword')} autoComplete="new-password" /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label="Toggle confirm password visibility">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Sign Up'}</button>
        <p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </main>
  )
}

export default SignUpScreen
