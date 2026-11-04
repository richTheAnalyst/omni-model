import { lazy, Suspense, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './api/client.js'
import Shell from './components/Shell.jsx'
import StartupScreen, { ConfigMissing } from './components/StartupScreen.jsx'
import { PageSkeleton } from './components/States.jsx'
import { initAccount } from './store/accountSlice.js'
import { bootstrap } from './store/profilesSlice.js'
import { loadTracking } from './store/trackingSlice.js'

// Every screen is its own chunk, loaded when first visited.
const Welcome = lazy(() => import('./pages/Welcome.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const FindLeads = lazy(() => import('./pages/FindLeads.jsx'))
const Leads = lazy(() => import('./pages/Leads.jsx'))
const LeadDetail = lazy(() => import('./pages/LeadDetail.jsx'))
const OutreachIndex = lazy(() => import('./pages/OutreachIndex.jsx'))
const OutreachWorkspace = lazy(() => import('./pages/OutreachWorkspace.jsx'))
const BulkOutreach = lazy(() => import('./pages/BulkOutreach.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const Activity = lazy(() => import('./pages/Activity.jsx'))
const Pipeline = lazy(() => import('./pages/Pipeline.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

function HomeGate() {
  const seen = useSelector((s) => s.settings.welcomeSeen)
  return seen ? <Home /> : <Navigate to="/welcome" replace />
}

export default function App() {
  const dispatch = useDispatch()
  const phase = useSelector((s) => s.profiles.phase)
  const accountStatus = useSelector((s) => s.account.status)

  useEffect(() => {
    if (isConfigured) {
      dispatch(bootstrap())
      dispatch(initAccount())
    }
  }, [dispatch])

  // Once someone is signed in, fetch the leads they saved on any device.
  useEffect(() => {
    if (accountStatus === 'signedIn') dispatch(loadTracking())
  }, [accountStatus, dispatch])

  if (!isConfigured) return <ConfigMissing />
  if (phase !== 'ready') return <StartupScreen />

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route element={<Shell />}>
          <Route index element={<HomeGate />} />
          <Route path="find" element={<FindLeads />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:leadId" element={<LeadDetail />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="outreach" element={<OutreachIndex />} />
          <Route path="outreach/bulk" element={<BulkOutreach />} />
          <Route path="outreach/:leadId" element={<OutreachWorkspace />} />
          <Route path="account" element={<Account />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}