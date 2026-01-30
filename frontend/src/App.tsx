import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { FloorPlanPage } from './pages/FloorPlanPage'
import { ReservationsPage } from './pages/ReservationsPage'
import { PosPage } from './pages/PosPage'
import { SectionOrdersPage } from './pages/SectionOrdersPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { ReportsPage } from './pages/ReportsPage'
import { OrderHistoryPage } from './pages/OrderHistoryPage'
import { useAuth } from './context/AuthContext'
import { AccessDenied } from './components/AccessDenied'
import { Toaster } from 'react-hot-toast'

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading } = useAuth()
  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading session...</div>
  }
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const RoleBasedRedirect = () => {
  const { user, hasPermission } = useAuth()

  if (hasPermission('manage_settings')) {
    return <FloorPlanPage />
  }
  if (hasPermission('manage_reservations')) {
    return <FloorPlanPage />
  }
  if (user?.prep_section_id) {
    return <Navigate to={`/sections/${user.prep_section_id}/orders`} replace />
  }
  if (hasPermission('create_order')) {
    return <Navigate to="/pos" replace />
  }
  if (hasPermission('view_only')) {
    return <FloorPlanPage />
  }

  return <AccessDenied />
}

const RequirePermission = ({
  permission,
  children,
}: {
  permission: string
  children: React.ReactNode
}) => {
  const { hasPermission } = useAuth()
  if (hasPermission(permission)) {
    return <>{children}</>
  }
  return <AccessDenied />
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route
            index
            element={<RoleBasedRedirect />}
          />
          <Route
            path="reservations"
            element={
              <RequirePermission permission="manage_reservations">
                <ReservationsPage />
              </RequirePermission>
            }
          />
          <Route
            path="pos"
            element={
              <RequirePermission permission="create_order">
                <PosPage />
              </RequirePermission>
            }
          />
          <Route
            path="sections/:sectionId/orders"
            element={
              <RequirePermission permission="update_item_status">
                <SectionOrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="admin"
            element={
              <RequirePermission permission="manage_settings">
                <AdminDashboardPage />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission permission="view_reports">
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="archive"
            element={
              <RequirePermission permission="view_reports">
                <OrderHistoryPage />
              </RequirePermission>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            fontWeight: 900,
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '16px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#6366f1',
              secondary: '#fff',
            },
          },
        }}
      />
    </ErrorBoundary>
  )
}

export default App
