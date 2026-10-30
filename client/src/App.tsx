import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DisasterDataProvider } from './context/DisasterDataContext';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import WeaponDetection from './pages/WeaponDetection';
import CrowdDetection from './pages/CrowdDetection';
import ImageRecognition from './pages/ImageRecognition';
import UserLostAndFound from './pages/UserLostAndFound';
import AdminLostAndFound from './pages/AdminLostAndFound';
import DoctorRegistration from './pages/DoctorRegistration';
import DoctorAssistance from './pages/DoctorAssistance';
import DoctorSignup from './pages/DoctorSignup';
import PilgrimTracker from './pages/PilgrimTracker';
import AIMap from './pages/AIMap';
import Analytics from './pages/Analytics';
import DisasterPrediction from './pages/DisasterPrediction';
import DisasterManagement from './pages/DisasterManagement';

import DisasterLayout from './components/DisasterLayout';
import DisasterDashboard from './pages/disaster/DisasterDashboard';
import DisasterWeather from './pages/disaster/DisasterWeather';
import DisasterEarthquake from './pages/disaster/DisasterEarthquake';
import DisasterCrowd from './pages/disaster/DisasterCrowd';
import DisasterTraffic from './pages/disaster/DisasterTraffic';
import DisasterAlerts from './pages/disaster/DisasterAlerts';
import DisasterEmergency from './pages/disaster/DisasterEmergency';
import DisasterSatellite from './pages/disaster/DisasterSatellite';
import DisasterPilgrim from './pages/disaster/DisasterPilgrim';
import DisasterApiTest from './pages/disaster/DisasterApiTest';

import DoctorLayout from './components/DoctorLayout';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorVideoQueue from './pages/doctor/DoctorVideoQueue';
import DoctorProfile from './pages/doctor/DoctorProfile';

import MedicalLayout from './components/MedicalLayout';
import MedicalDashboard from './pages/medical/MedicalDashboard';
import MedicalVideoQueue from './pages/medical/MedicalVideoQueue';
import MedicalDoctors from './pages/medical/MedicalDoctors';
import MedicalHospitals from './pages/medical/MedicalHospitals';

import EmergencyCall from './pages/EmergencyCall';

import SiteNav from './components/SiteNav';
import SiteFooter from './components/SiteFooter';
import { ThemeProvider } from "@/components/theme-provider"
import ChatbotPopup from './components/ChatbotPopup';
import PreviewAuth from './dev/PreviewAuth';

function AppShell() {
  const location = useLocation();
  const isAIMapRoute = location.pathname === '/ai-map' || location.pathname === '/__preview/ai-map';
  const isAuthRoute = ['/login', '/register', '/doctor-signup'].includes(location.pathname);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <div style={{ minHeight: '100vh', background: 'hsl(var(--background))' }}>
          {!isAIMapRoute && <SiteNav dark={isAuthRoute} />}
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/doctor-signup" element={<DoctorSignup />} />

            {/* Shared protected routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Lost & Found - different pages for user vs admin */}
            <Route path="/lost-and-found" element={<ProtectedRoute allowedRoles={['admin']}><AdminLostAndFound /></ProtectedRoute>} />
            <Route path="/report-missing" element={<ProtectedRoute allowedRoles={['user']}><UserLostAndFound /></ProtectedRoute>} />

            {/* Admin-only routes */}
            <Route path="/weapon-detection" element={<ProtectedRoute allowedRoles={['admin']}><WeaponDetection /></ProtectedRoute>} />
            <Route path="/crowd-detection" element={<ProtectedRoute allowedRoles={['admin']}><CrowdDetection /></ProtectedRoute>} />
            <Route path="/image-recognition" element={<ProtectedRoute allowedRoles={['admin']}><ImageRecognition /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />

            {/* Disaster routes - shared across all authenticated panels */}
            <Route path="/disaster-prediction" element={<ProtectedRoute allowedRoles={['admin', 'user', 'medical_admin', 'doctor']}><DisasterDataProvider><DisasterLayout /></DisasterDataProvider></ProtectedRoute>}>
              <Route index element={<DisasterPrediction />} />
              <Route path="overview" element={<DisasterDashboard />} />
              <Route path="weather" element={<DisasterWeather />} />
              <Route path="earthquakes" element={<DisasterEarthquake />} />
              <Route path="crowd" element={<DisasterCrowd />} />
              <Route path="traffic" element={<DisasterTraffic />} />
              <Route path="satellite" element={<DisasterSatellite />} />
              <Route path="api-test" element={<DisasterApiTest />} />
            </Route>

            <Route path="/disaster-management" element={<ProtectedRoute allowedRoles={['admin', 'user', 'medical_admin', 'doctor']}><DisasterDataProvider><DisasterLayout /></DisasterDataProvider></ProtectedRoute>}>
              <Route index element={<DisasterManagement />} />
              <Route path="overview" element={<DisasterDashboard />} />
              <Route path="alerts" element={<DisasterAlerts />} />
              <Route path="emergency" element={<DisasterEmergency />} />
              <Route path="pilgrim" element={<DisasterPilgrim />} />
            </Route>

            {/* User routes */}
            <Route path="/pilgrim-tracker" element={<ProtectedRoute allowedRoles={['user']}><PilgrimTracker /></ProtectedRoute>} />
            <Route path="/emergency-call" element={<ProtectedRoute allowedRoles={['user']}><EmergencyCall /></ProtectedRoute>} />
            <Route path="/doctor-assistance" element={<ProtectedRoute allowedRoles={['user', 'medical_admin', 'doctor']}><DoctorAssistance /></ProtectedRoute>} />
            <Route path="/doctor-registration" element={<ProtectedRoute allowedRoles={['user']}><DoctorRegistration /></ProtectedRoute>} />
            <Route path="/ai-map" element={<ProtectedRoute allowedRoles={['user']}><AIMap /></ProtectedRoute>} />

            {/* Doctor panel routes */}
            <Route path="/doctor-panel" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorLayout /></ProtectedRoute>}>
              <Route index element={<DoctorDashboard />} />
              <Route path="video-queue" element={<DoctorVideoQueue />} />
              <Route path="profile" element={<DoctorProfile />} />
            </Route>

            {/* Medical admin routes */}
            <Route path="/medical-admin" element={<ProtectedRoute allowedRoles={['medical_admin']}><MedicalLayout /></ProtectedRoute>}>
              <Route index element={<MedicalDashboard />} />
              <Route path="video-queue" element={<MedicalVideoQueue />} />
              <Route path="doctors" element={<MedicalDoctors />} />
              <Route path="hospitals" element={<MedicalHospitals />} />
            </Route>

            {/* Dev-only preview of protected pages without signing in */}
            {import.meta.env.DEV && (
              <>
                <Route path="/__preview/dashboard" element={<PreviewAuth><Dashboard /></PreviewAuth>} />
                <Route path="/__preview/disaster-prediction" element={<PreviewAuth><DisasterDataProvider><DisasterLayout /></DisasterDataProvider></PreviewAuth>}>
                  <Route index element={<DisasterPrediction />} />
                  <Route path="overview" element={<DisasterDashboard />} />
                  <Route path="weather" element={<DisasterWeather />} />
                  <Route path="earthquakes" element={<DisasterEarthquake />} />
                  <Route path="crowd" element={<DisasterCrowd />} />
                  <Route path="traffic" element={<DisasterTraffic />} />
                  <Route path="satellite" element={<DisasterSatellite />} />
                </Route>
                <Route path="/__preview/disaster-management" element={<PreviewAuth><DisasterDataProvider><DisasterLayout /></DisasterDataProvider></PreviewAuth>}>
                  <Route index element={<DisasterManagement />} />
                  <Route path="overview" element={<DisasterDashboard />} />
                  <Route path="alerts" element={<DisasterAlerts />} />
                  <Route path="emergency" element={<DisasterEmergency />} />
                  <Route path="pilgrim" element={<DisasterPilgrim />} />
                </Route>
                <Route path="/__preview/ai-map" element={<PreviewAuth><AIMap /></PreviewAuth>} />
              </>
            )}

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          {!isAIMapRoute && <SiteFooter dark={isAuthRoute} />}
          {!isAIMapRoute && <ChatbotPopup/>}
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
