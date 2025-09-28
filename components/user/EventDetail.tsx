import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const EventCarousel = ({ images }: { images: string[] }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = useCallback(() => {
        setCurrentSlide(prev => (prev === images.length - 1 ? 0 : prev + 1));
    }, [images.length]);

    const prevSlide = () => {
        setCurrentSlide(prev => (prev === 0 ? images.length - 1 : prev - 1));
    };

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [images.length, nextSlide]);

    if (!images || images.length === 0) {
        return <div className="w-full h-auto max-h-[500px] bg-surface rounded-2xl flex items-center justify-center"><p>No hay imagen</p></div>;
    }

    return (
        <div className="relative w-full h-auto max-h-[500px] aspect-video rounded-2xl overflow-hidden shadow-lg">
            {images.map((src, index) => (
                <div key={index} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={src} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                </div>
            ))}
             {images.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute top-1/2 left-3 transform -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 z-10 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <button onClick={nextSlide} className="absolute top-1/2 right-3 transform -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 z-10 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                </>
            )}
        </div>
    );
};

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { getEventById } = useAppContext();
  const navigate = useNavigate();
  
  if (!eventId) return <div>ID de evento no encontrado.</div>;
  const event = getEventById(eventId);

  if (!event) return <div>Evento no encontrado.</div>;
  
  const handleSelectTickets = (ticketTypeId: string) => {
      navigate(`/evento/${eventId}/seleccionar/${ticketTypeId}`);
  };

  const allImages = [event.mainImage, ...event.carouselImages].filter(Boolean);
  const isSalesEnabled = event.salesEnabled ?? true;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="lg:w-2/3">
          <EventCarousel images={allImages} />
          <h1 className="text-4xl font-extrabold mt-6 mb-2">{event.name}</h1>
          <p className="text-accent font-semibold">{new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las {event.time} hs</p>
          <div className="mt-6 prose prose-invert max-w-none text-text-secondary">
            <p>{event.description}</p>
          </div>

          {event.reservationDetails && (
             <div className="mt-8 bg-surface/50 border border-border rounded-lg p-4">
                <h3 className="font-bold text-lg text-text-primary mb-2">Detalles de la Reserva</h3>
                <p className="text-text-secondary whitespace-pre-wrap">{event.reservationDetails}</p>
             </div>
          )}
        </div>

        <div className="lg:w-1/3">
            <div className="bg-surface rounded-2xl p-6 border border-border sticky top-24">
                <h2 className="text-2xl font-bold mb-4">Comprar Tickets</h2>
                {!isSalesEnabled && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4 text-center" role="alert">
                        La venta de tickets para este evento se encuentra cerrada.
                    </div>
                )}
                <div className="space-y-4">
                    {event.ticketTypes.map(ticket => (
                        <div key={ticket.id} className="bg-background p-4 rounded-lg border border-border flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-text-primary">{ticket.name}</h3>
                                <p className="text-lg text-primary font-bold">${ticket.price} <span className="text-sm text-text-secondary font-normal">+ ${ticket.fee} fee</span></p>
                                {ticket.bookingRules && (
                                    <p className="text-xs text-amber-400 mt-1 italic">{ticket.bookingRules}</p>
                                )}
                            </div>
                            <button 
                                onClick={() => handleSelectTickets(ticket.id)}
                                disabled={!isSalesEnabled}
                                className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 flex-shrink-0 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-gray-600"
                            >
                                {isSalesEnabled ? 'Seleccionar' : 'Cerrado'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;