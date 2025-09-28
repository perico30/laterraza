import React from 'react';
import { useAppContext } from '../../context/AppContext';

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
    <div className="bg-surface rounded-xl p-6 flex items-center space-x-4 border border-border">
        <div className="bg-primary/20 text-primary p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-text-secondary text-sm">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);


const Dashboard = () => {
  const { events, pendingPurchases, approvePurchase, rejectPurchase, completedPurchases } = useAppContext();

  const renderPurchaseDetails = (purchase: any) => {
    const event = events.find(e => e.id === purchase.eventId);
    const ticketType = event?.ticketTypes.find(tt => tt.id === purchase.ticketTypeId);

    let details = '';
    if (purchase.selectedShapes.length > 0) {
        details = purchase.selectedShapes.map((s: any) => {
            const shape = event?.venueShapes.find(vs => vs.id === s.shapeId);
            let detailStr = shape?.label || s.shapeId;
            if (s.bookingChoice === 'combo') detailStr += ' (Combo)';
            if (s.bookingChoice === 'minTickets') detailStr += ' (Tickets Mín.)';
            return detailStr;
        }).join(', ');
    } else {
        details = `${purchase.generalQuantity} x ${ticketType?.name || 'General'}`;
    }
    return details;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Inicio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ventas Totales" value="$12,450" icon={<DollarSignIcon className="w-6 h-6"/>} />
        <StatCard title="Tickets Vendidos" value="832" icon={<TicketIcon className="w-6 h-6"/>} />
        <StatCard title="Eventos Activos" value="4" icon={<CalendarIcon className="w-6 h-6"/>} />
        <StatCard title="Nuevos Usuarios" value="56" icon={<UsersIcon className="w-6 h-6"/>} />
      </div>

      <div className="mt-8 bg-surface rounded-xl p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Solicitudes de Pago Pendientes</h2>
          {pendingPurchases.length > 0 ? (
              <ul className="space-y-4">
                  {pendingPurchases.map(purchase => (
                      <li key={purchase.id} className="bg-background p-4 rounded-lg border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                              <p className="font-bold text-text-primary">{events.find(e => e.id === purchase.eventId)?.name || 'Evento Desconocido'}</p>
                              <p className="text-sm text-text-secondary">Detalles: {renderPurchaseDetails(purchase)}</p>
                              <p className="text-lg font-bold text-primary">${purchase.totalPrice.toFixed(2)}</p>
                              <p className="text-xs text-text-secondary/70">Solicitado: {new Date(purchase.timestamp).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 self-end sm:self-center flex-shrink-0">
                              <button onClick={() => approvePurchase(purchase.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-sm transition">Aprobar</button>
                              <button onClick={() => rejectPurchase(purchase.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg text-sm transition">Rechazar</button>
                          </div>
                      </li>
                  ))}
              </ul>
          ) : (
              <p className="text-text-secondary">No hay solicitudes de pago pendientes de verificación.</p>
          )}
      </div>

       <div className="mt-8 bg-surface rounded-xl p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Historial de Compras</h2>
          {completedPurchases.length > 0 ? (
              <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {completedPurchases.map(purchase => (
                      <li key={purchase.id} className="bg-background p-4 rounded-lg border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                              <p className="font-bold text-text-primary">{events.find(e => e.id === purchase.eventId)?.name || 'Evento Desconocido'}</p>
                              <p className="text-sm text-text-secondary">Detalles: {renderPurchaseDetails(purchase)}</p>
                              <p className="text-lg font-bold text-primary">${purchase.totalPrice.toFixed(2)}</p>
                              <p className="text-xs text-text-secondary/70">Aprobado: {new Date(purchase.approvalTimestamp).toLocaleString()}</p>
                          </div>
                          <div className="flex-shrink-0">
                             <span className="text-sm font-medium bg-green-900/50 text-green-300 border border-green-700 px-3 py-1 rounded-full">Aprobado</span>
                          </div>
                      </li>
                  ))}
              </ul>
          ) : (
              <p className="text-text-secondary">No hay compras completadas en el historial.</p>
          )}
      </div>
    </div>
  );
};

// Icons
const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
);
const TicketIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h-1.5m2.14-13.5 5.142 5.142m-5.142 0-5.142 5.142m5.142-5.142 5.142-5.142m-5.142 5.142-5.142-5.142" /></svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M-7.5 12h1.5" /></svg>
);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.284-2.72-4.682 2.72a3 3 0 0 0-4.682-2.72m16.6-4.22a3 3 0 0 0-4.682-2.72 3 3 0 0 0-4.682 2.72m16.6 0 4.682-2.72a3 3 0 0 0-4.682-2.72m-7.284 2.72 4.682 2.72m-4.682-2.72-4.682 2.72a3 3 0 0 0-4.682 2.72M3 18.72v-3.72a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3.72" /></svg>
);

export default Dashboard;