import { Outlet, useLocation } from 'react-router-dom'
import LeftSidebar from '../components/LeftSidebar'
import RightSidebar from '../components/RightSidebar'

function MainLayout() {
  const { pathname } = useLocation()
  const isHomeScreen = pathname === '/'

  return (
    <div className={isHomeScreen ? 'main-layout has-right-sidebar' : 'main-layout two-column-layout'}>
      <LeftSidebar />
      <main className="main-content thin-scrollbar">
        <Outlet />
      </main>
      {isHomeScreen && <RightSidebar />}
    </div>
  )
}

export default MainLayout
