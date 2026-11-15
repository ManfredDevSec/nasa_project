import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { MEDICAL_ROLES, getToken, getUser, homePathFor } from './utils/auth.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import VisionTest from './pages/VisionTest.jsx'
import Result from './pages/Result.jsx'
import Trends from './pages/Trends.jsx'
import CrewDashboard from './pages/CrewDashboard.jsx'
import EarthReport from './pages/EarthReport.jsx'
import Learn from './pages/Learn.jsx'
import Landing from './pages/Landing.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Account from './pages/Account.jsx'
import AdminUsers from './pages/AdminUsers.jsx'

// Unknown URLs go to the right home page for whoever is logged in.
function RootRedirect() {
  return <Navigate to={getToken() ? homePathFor(getUser()) : '/login'} replace />
}

export default function App() {
  return (
    // BASE_URL lets the app work when it is hosted in a sub-folder.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* The public landing page; its "Open Sightline" button leads to login or the user's home */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        {/* Forgot password; the emailed reset link (also used for new-account invites) opens /reset-password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Everything below needs a login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Only accounts linked to an astronaut (crew + medical officer) */}
            <Route element={<ProtectedRoute requireAstronaut />}>
              <Route path="/home" element={<Home />} />
              <Route path="/test" element={<VisionTest />} />
              <Route path="/result" element={<Result />} />
            </Route>
            <Route element={<ProtectedRoute roles={MEDICAL_ROLES} />}>
              <Route path="/crew" element={<CrewDashboard />} />
            </Route>
            <Route path="/trends/:id" element={<Trends />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/account" element={<Account />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* The report is a plain white page without the dark app frame */}
          <Route element={<ProtectedRoute roles={MEDICAL_ROLES} />}>
            <Route path="/report" element={<EarthReport />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
