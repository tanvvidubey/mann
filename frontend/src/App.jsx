import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useDailyReminder } from './hooks/useDailyReminder'
import Home from './pages/Home'
import Record from './pages/Record'
import Write from './pages/Write'
import Entry from './pages/Entry'
import Insights from './pages/Insights'
import Suggestions from './pages/Suggestions'
import Search from './pages/Search'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import VerifyEmail from './pages/VerifyEmail'
import ChangePin from './pages/ChangePin'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  useDailyReminder(isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/change-pin" element={<ChangePin />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="record" element={<PrivateRoute><Record /></PrivateRoute>} />
        <Route path="write" element={<PrivateRoute><Write /></PrivateRoute>} />
        <Route path="entry/:id" element={<PrivateRoute><Entry /></PrivateRoute>} />
        <Route path="insights" element={<PrivateRoute><Insights /></PrivateRoute>} />
        <Route path="suggestions" element={<PrivateRoute><Suggestions /></PrivateRoute>} />
        <Route path="search" element={<PrivateRoute><Search /></PrivateRoute>} />
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
