import React, { useEffect, ReactNode } from 'react';
// FIX: Import Outlet for use in the refactored ProtectedRoute component.
import { HashRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import AdminEvents from './components/admin/AdminEvents';
import Users from './components/admin/Users';
import Settings from './components/admin/Settings';
import UserHome from './components/user/UserHome';
import EventDetail from './components/user/EventDetail';
import EventSelection from './components/user/EventSelection';
import { AppProvider, useAppContext } from './context/AppContext';
import Footer from './components/Footer';
import MyTickets from './components/user/MyTickets';
import TicketScanner from './components/admin/TicketScanner';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

const colorLuminance = (hex: string, lum: number): string => {
  hex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  lum = lum || 0;
  let rgb = "#", c, i;
  for (i = 0; i < 3; i++) {
    c = parseInt(hex.substr(i * 2, 2), 16);
    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
    rgb += ("00" + c).substr(c.length);
  }
  return rgb;
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
);

// FIX: Refactored ProtectedRoute to use react-router-dom v6's Outlet pattern.
const ProtectedRoute = ({ requireAdmin }: { requireAdmin?: boolean }) => {
  const { currentUser } = useAppContext();
  const location = useLocation();

  if (currentUser === undefined) {
    return <LoadingSpinner />; // Show loader while checking auth status
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requireAdmin && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />; 
  }

  return <Outlet />;
};

function ThemedApp() {
  const { settings, currentUser, logout } = useAppContext();

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--color-primary-hover', colorLuminance(settings.primaryColor, -0.1));
    document.documentElement.style.setProperty('--color-accent', colorLuminance(settings.primaryColor, 0.2));
    document.documentElement.style.setProperty('--color-background', settings.backgroundColor);
  }, [settings.primaryColor, settings.backgroundColor]);

  if (currentUser === undefined) {
      return <LoadingSpinner />;
  }

  return (
    <div className="bg-background min-h-screen text-text-primary flex flex-col">
      <nav className="bg-surface/80 backdrop-blur-sm sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
               <Link to="/" className="flex items-center" aria-label="Página de inicio de EventHive">
                  {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo EventHive" className="h-8 w-auto" />
                  ) : (
                      <span className="text-2xl font-bold text-primary">EventHive</span>
                  )}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
               <Link to="/" className="text-text-secondary hover:text-text-primary transition px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                {currentUser ? (
                 <>
                   <Link to="/mis-tickets" className="text-text-secondary hover:text-text-primary transition px-3 py-2 rounded-md text-sm font-medium">Mis Tickets</Link>
                   {currentUser.role === 'admin' && (
                      <Link to="/admin" className="text-text-secondary hover:text-text-primary transition px-3 py-2 rounded-md text-sm font-medium">Admin Panel</Link>
                   )}
                   <span className="text-text-primary text-sm font-medium hidden sm:block">Hola, {currentUser.username}</span>
                   <button onClick={logout} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                     Cerrar Sesión
                   </button>
                 </>
               ) : (
                 <>
                   <Link to="/login" className="text-text-secondary hover:text-text-primary transition px-3 py-2 rounded-md text-sm font-medium">Iniciar Sesión</Link>
                   <Link to="/registro" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                     Registrarse
                   </Link>
                 </>
               )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<UserHome />} />
          <Route path="/evento/:eventId" element={<EventDetail />} />
          <Route path="/evento/:eventId/seleccionar/:ticketType" element={<EventSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          
          {/* Protected User Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/mis-tickets" element={<MyTickets />} />
          </Route>
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="inicio" replace />} />
              <Route path="inicio" element={<Dashboard />} />
              <Route path="eventos" element={<AdminEvents />} />
              <Route path="escanear" element={<TicketScanner />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="ajustes" element={<Settings />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ThemedApp />
      </HashRouter>
    </AppProvider>
  );
}

export default App;