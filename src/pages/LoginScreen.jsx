import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import ThemeToggleButton from '../components/ThemeToggleButton'

function authErrorMessage(error) {
  if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
    return 'The email or password is incorrect.'
  }
  if (error.code === 'auth/invalid-email') return 'Enter a valid email address.'
  return 'Unable to log in right now. Please try again.'
}

function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (submitError) {
      setError(authErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="auth-loading">Checking your session...</div>
  if (user) return <Navigate to="/" replace />

  return (
    <main className="auth-page thin-scrollbar">
      <ThemeToggleButton />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-header">
          <img src={logo} alt="AlonzoTech Logo" className="auth-logo" />
          <p className="auth-eyebrow">AlonzoTech</p>
          <h1>Welcome Back</h1>
          <p className="auth-description">Log in to join the conversation.</p>
        </div>

        <label className="auth-label" htmlFor="login-email">Email</label>
        <input id="login-email" className="auth-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />

        <label className="auth-label" htmlFor="login-password">Password</label>
        <div className="password-input">
          <input id="login-password" className="auth-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Logging in...' : 'Login'}</button>
        <p className="auth-switch">No account yet? <Link to="/signup">Sign Up</Link></p>
      </form>
    </main>
  )
}

export default LoginScreen
