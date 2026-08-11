import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'

import { BottomNav } from './components/BottomNav'
import { RightRail } from './components/RightRail'
import { Sidebar } from './components/Sidebar'
import Login from './screens/Login'
import Splash from './screens/Splash'
import { useApp } from './lib/store'

// Heavy screens are code-split so the initial bundle stays small.
const Home = lazy(() => import('./screens/Home'))
const CreatePost = lazy(() => import('./screens/CreatePost'))
const IssueDetail = lazy(() => import('./screens/IssueDetail'))
const MapScreen = lazy(() => import('./screens/MapScreen'))
const Notifications = lazy(() => import('./screens/Notifications'))
const Onboarding = lazy(() => import('./screens/Onboarding'))
const Profile = lazy(() => import('./screens/Profile'))
const Search = lazy(() => import('./screens/Search'))
const Settings = lazy(() => import('./screens/Settings'))
const Updates = lazy(() => import('./screens/Updates'))

const ResetPassword = lazy(() => import('./screens/ResetPassword'))
const OrgLogin = lazy(() => import('./screens/gov/GovLogin'))
const OrgLayout = lazy(() => import('./screens/gov/GovLayout'))
const OrgOverview = lazy(() => import('./screens/gov/Overview'))
const OrgIssues = lazy(() => import('./screens/gov/DeptIssues'))
const Admin = lazy(() => import('./screens/gov/Admin'))

/** Centered content column shared by every screen on desktop. */
function Column({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[680px] px-4 lg:mx-0 lg:max-w-none lg:border-x-0 lg:px-8">
      {children}
    </div>
  )
}

/** Auth screens fill the whole viewport — layout is handled inside each screen. */
function AuthColumn({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh w-full">{children}</div>
}

function GlobalSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-green/30 border-t-green" />
    </div>
  )
}

/** Desktop: sidebar + column + rail. Mobile: column + bottom nav. */
function AppShell() {
  return (
    <div className="lg:flex lg:min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Column>
          <div className="pb-24 lg:pb-0">
            <Outlet />
          </div>
        </Column>
      </main>
      <RightRail />
      <BottomNav />
    </div>
  )
}

/** Immersive detail page: desktop chrome, no bottom nav (it has its own action bar). */
function DetailShell({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Column>{children}</Column>
      </main>
      <RightRail />
    </div>
  )
}

/** Citizen app guard: signed in + onboarded (username & home area chosen). */
function RequireApp() {
  const { sessionReady, profileResolved, loggedIn, needsOnboarding } = useApp()
  if (!sessionReady || (loggedIn && !profileResolved)) return <GlobalSpinner />
  if (!loggedIn) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** Onboarding guard: signed in; not yet onboarded, OR explicitly editing (?edit=1). */
function RequireOnboarding() {
  const { sessionReady, profileResolved, loggedIn, needsOnboarding } = useApp()
  const [searchParams] = useSearchParams()
  if (!sessionReady || (loggedIn && !profileResolved)) return <GlobalSpinner />
  if (!loggedIn) return <Navigate to="/login" replace />
  if (!needsOnboarding && searchParams.get('edit') !== '1') return <Navigate to="/app/home" replace />
  return <Outlet />
}

/** Persistent banner shown when the DB schema is missing. */
function SetupBanner() {
  const { appError, clearAppError } = useApp()
  if (!appError) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-red/20 bg-red/[0.08] px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[680px] items-start gap-3">
        <span className="mt-0.5 text-lg">⚠️</span>
        <p className="flex-1 text-[12.5px] font-medium leading-relaxed text-red">{appError}</p>
        <button
          onClick={clearAppError}
          className="mt-0.5 shrink-0 text-[11px] font-bold text-red/60 hover:text-red"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isGov = location.pathname.startsWith('/gov')
  return (
    <div className={isGov ? 'gov-frame' : 'app-frame'}>
      <SetupBanner />
      <Suspense fallback={<GlobalSpinner />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<AuthColumn><Login /></AuthColumn>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<AuthColumn><RequireOnboarding /></AuthColumn>}>
            <Route index element={<Onboarding />} />
          </Route>
          <Route path="/app" element={<RequireApp />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="map" element={<MapScreen />} />
              <Route path="create" element={<CreatePost />} />
              <Route path="updates" element={<Updates />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="search" element={<Search />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="/issue/:id" element={<DetailShell><IssueDetail /></DetailShell>} />
          <Route path="/gov" element={<OrgLogin />} />
          <Route path="/gov/portal" element={<OrgLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OrgOverview />} />
            <Route path="issues" element={<OrgIssues />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}
