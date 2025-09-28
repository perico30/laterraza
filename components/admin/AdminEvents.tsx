
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Event } from '../../types';
import EventEditor from './EventEditor';

const AdminEvents = () => {
  const { events, deleteEvent } = useAppContext();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsEditorOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el evento "${eventName}"? Esta acción no se puede deshacer.`)) {
        deleteEvent(eventId);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Eventos</h1>
        <button
          onClick={handleCreateEvent}
          className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Crear Evento
        </button>
      </div>
      
      {isEditorOpen ? (
        <EventEditor event={selectedEvent} onClose={handleCloseEditor} />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <ul role="list" className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="p-4 sm:p-6 hover:bg-background/50 transition">
                <div className="flex items-center space-x-4">
                  <img className="w-24 h-16 rounded-lg object-cover" src={event.mainImage} alt={event.name} />
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-text-primary">{event.name}</p>
                    <p className="text-sm text-text-secondary">{new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {event.time}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="text-primary hover:text-accent font-semibold transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.name)}
                      className="text-red-500 hover:text-red-400 font-semibold transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);

export default AdminEvents;