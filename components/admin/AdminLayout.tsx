import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-primary text-white shadow-lg'
        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
    }`;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-64 bg-secondary p-4 flex-shrink-0 border-r border-border">
        <nav className="space-y-2">
          <NavLink to="inicio" className={navLinkClasses}>
            <HomeIcon className="w-5 h-5 mr-3" />
            Inicio
          </NavLink>
          <NavLink to="eventos" className={navLinkClasses}>
            <CalendarIcon className="w-5 h-5 mr-3" />
            Eventos
          </NavLink>
          <NavLink to="escanear" className={navLinkClasses}>
            <QrCodeIcon className="w-5 h-5 mr-3" />
            Escanear Tickets
          </NavLink>
          <NavLink to="usuarios" className={navLinkClasses}>
            <UsersIcon className="w-5 h-5 mr-3" />
            Usuarios
          </NavLink>
          <NavLink to="ajustes" className={navLinkClasses}>
            <SettingsIcon className="w-5 h-5 mr-3" />
            Ajustes
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

// SVG Icon Components
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M-7.5 12h1.5" /></svg>
);
const QrCodeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A.75.75 0 0 1 4.5 3.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm0 9.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm9.75-9.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm4.5 9.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 .75-.75h4.5Z" /></svg>
);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-2.253M15 19.128v-3.863a3.375 3.375 0 0 0-3.375-3.375h-1.5A3.375 3.375 0 0 0 6.75 15.265v3.863M15 19.128A9.37 9.37 0 0 0 9.375 21a9.37 9.37 0 0 0-5.625-2.253M18.375 14.25a3.375 3.375 0 0 0-3.375-3.375h-1.5a3.375 3.375 0 0 0-3.375 3.375M9.375 11.25a3.375 3.375 0 0 1 3.375-3.375h1.5a3.375 3.375 0 0 1 3.375 3.375m-7.5 3-3.375 3.375" /></svg>
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.082.499a11.954 11.954 0 0 1 2.252 1.321l.443-.178c.529-.212 1.127-.045 1.488.397.362.442.438 1.05.19 1.55l-.26.52a11.954 11.954 0 0 1 0 2.502l.26.52c.248.5.172 1.108-.19 1.55a1.12 1.12 0 0 1-.74.45c-.296.043-.593.03-.872-.046l-.443-.178a11.954 11.954 0 0 1-2.252 1.321l-.082.499c-.09.542-.56 1.007-1.11 1.226-.55.22-1.156.22-1.706 0-.55-.22-1.02-.684-1.11-1.226l-.082-.499a11.954 11.954 0 0 1-2.252-1.321l-.443.178c-.529.212-1.127.045-1.488-.397-.362-.442-.438-1.05-.19-1.55l.26-.52a11.954 11.954 0 0 1 0-2.502l-.26-.52c-.248-.5-.172-1.108.19-1.55.361-.442.96-.61 1.488-.397l.443.178c.673.271 1.3.623 1.864 1.034a11.954 11.954 0 0 1 2.252-1.321l.082-.499Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
);

export default AdminLayout;