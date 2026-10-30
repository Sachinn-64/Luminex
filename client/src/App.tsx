import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

import GooeyNav from './components/GooeyNav';
import { Footer2 } from './components/Footer2';
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from './components/mode-toggle';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { useAuth } from './context/AuthContext';
import ChatbotPopup from './components/ChatbotPopup';
import LanguageSwitcher from './components/LanguageSwitcher';
import VoiceNavigator from './components/VoiceNavigator';

const navItems = [
  { label: 'Home', href: 'http://localhost:3000/' },
  { label: 'Dashboard', href: '#/dashboard' },
  { label: 'About', href: '#' },
];

function NavBar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', paddingTop: '1rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
      <a href="http://localhost:3000" className="notranslate" style={{ color: 'hsl(var(--foreground))', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, width: '100px' }}>LUMINEX</a>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <GooeyNav
          items={navItems}
          particleCount={15}
          particleDistances={[90, 10]}
          particleR={100}
          initialActiveIndex={1}
          animationTime={600}
          timeVariance={300}
          colors={[1, 2, 3, 1, 2, 3, 1, 4]}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '260px', justifyContent: 'flex-end' }}>
        <LanguageSwitcher />
        <ModeToggle />
        {profile && (
          <Avatar style={{ cursor: 'pointer' }} onClick={async () => { await logout(); navigate('/login'); }}>
            <AvatarFallback>
              {profile.name
                ? profile.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                : '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isAIMapRoute = location.pathname === '/ai-map';

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <div style={{ minHeight: '100vh', background: 'hsl(var(--background))' }}>
          {!isAIMapRoute && <NavBar />}
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
              <Route index element={<DisasterDashboard />} />
              <Route path="weather" element={<DisasterWeather />} />
              <Route path="earthquakes" element={<DisasterEarthquake />} />
              <Route path="crowd" element={<DisasterCrowd />} />
              <Route path="traffic" element={<DisasterTraffic />} />
              <Route path="alerts" element={<DisasterAlerts />} />
              <Route path="emergency" element={<DisasterEmergency />} />
              <Route path="satellite" element={<DisasterSatellite />} />
              <Route path="pilgrim" element={<DisasterPilgrim />} />
              <Route path="api-test" element={<DisasterApiTest />} />
            </Route>

            <Route path="/disaster-management" element={<ProtectedRoute allowedRoles={['admin', 'user', 'medical_admin', 'doctor']}><DisasterDataProvider><DisasterLayout /></DisasterDataProvider></ProtectedRoute>}>
              <Route index element={<DisasterDashboard />} />
              <Route path="weather" element={<DisasterWeather />} />
              <Route path="earthquakes" element={<DisasterEarthquake />} />
              <Route path="crowd" element={<DisasterCrowd />} />
              <Route path="traffic" element={<DisasterTraffic />} />
              <Route path="alerts" element={<DisasterAlerts />} />
              <Route path="emergency" element={<DisasterEmergency />} />
              <Route path="satellite" element={<DisasterSatellite />} />
              <Route path="pilgrim" element={<DisasterPilgrim />} />
              <Route path="api-test" element={<DisasterApiTest />} />
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

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          {!isAIMapRoute && <Footer2 />}
          {!isAIMapRoute && <ChatbotPopup/>}
          {!isAIMapRoute && <VoiceNavigator />}
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
