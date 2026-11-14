import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getToken, getUser, homePathFor, isAstronaut } from '../utils/auth.js'
import { AccessDenied } from './StateViews.jsx'

/**
 * Wrap routes that need a login. Optional `roles` limits who may enter;
 * `requireAstronaut` hides astronaut-only pages (/home, /test) from accounts
 * without an astronaut_id, such as the flight surgeon.
 */
export default function ProtectedRoute({ roles, requireAstronaut = false }) {
  const location = useLocation()
  const user = getUser()

  if (!getToken() || !user) {
    // Remember where the user wanted to go so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (requireAstronaut && !isAstronaut(user)) {
    return <Navigate to={homePathFor(user)} replace />
  }
  if (roles && !roles.includes(user.role)) {
    return <AccessDenied />
  }
  return <Outlet />
}
