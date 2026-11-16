import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import LoginScreen from './pages/LoginScreen'
import SignUpScreen from './pages/SignUpScreen'
import ArticlesScreen from './screens/ArticlesScreen'
import AccountScreen from './screens/AccountScreen'
import HomeScreen from './screens/HomeScreen'
import SettingsScreen from './screens/SettingsScreen'
import ViewArticleScreen from './pages/ViewArticleScreen'
import ViewProfileScreen from './pages/ViewProfileScreen'
import './App.css'
import { ThemeProvider } from './context/ThemeContext'

function AuthLoading() {
  return <div className="auth-loading">Checking your session...</div>
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
        <div className="app-shell">
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route element={<MainLayout />}>
              <Route path="/articles" element={<ArticlesScreen />} />
              <Route path="/articles/:id" element={<ViewArticleScreen />} />
              <Route path="/profile/:uid" element={<ViewProfileScreen />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/account" element={<AccountScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
              </Route>
            </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
