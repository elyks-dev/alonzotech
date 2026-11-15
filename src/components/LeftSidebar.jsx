import { NavLink } from 'react-router-dom'
import { Home, LogIn, Newspaper, User } from 'lucide-react'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'

const navigation = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Articles', path: '/articles', icon: Newspaper },
  { label: 'Account', path: '/account', icon: User },
]

function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="left-sidebar thin-scrollbar border-r border-gray-200 dark:border-gray-800" aria-label="Left sidebar">
      <div>
        <div className="mb-10 flex items-center gap-3 px-3">
        <img
          src={logo}
          alt="AlonzoTech Logo"
          className="h-10 w-10 object-contain"
        />
        <span className="text-xl font-bold tracking-tight">AlonzoTech</span>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Main navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-5 rounded-full px-4 py-3.5 text-base transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                    : 'font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icon size={23} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      {!user && (
        <NavLink
          to="/login"
          className={({ isActive }) =>
            `flex items-center gap-5 rounded-full px-4 py-3.5 text-base transition-colors duration-200 ${
              isActive
                ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                : 'font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`
          }
        >
          <LogIn size={23} />
          Login
        </NavLink>
      )}
    </aside>
  )
}

export default Sidebar
