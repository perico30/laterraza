import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Link } from 'react-router-dom';

const UserHome = () => {
    const { events } = useAppContext();
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = useCallback(() => {
        if (events.length > 0) {
            setCurrentSlide(prev => (prev === events.length - 1 ? 0 : prev + 1));
        }
    }, [events.length]);

    const prevSlide = () => {
        if (events.length > 0) {
            setCurrentSlide(prev => (prev === 0 ? events.length - 1 : prev - 1));
        }
    };

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    useEffect(() => {
        if (events.length <= 1) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 5000);
        return () => clearInterval(timer);
    }, [events.length, nextSlide]);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {events.length > 0 ? (
                <div className="relative w-full h-[50vh] md:h-[60vh] rounded-2xl overflow-hidden mb-12 shadow-2xl shadow-primary/20">
                    {/* Slides container */}
                    <div className="w-full h-full">
                        {events.map((event, index) => (
                            <div
                                key={event.id}
                                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0'}`}
                                aria-hidden={index !== currentSlide}
                            >
                                <img
                                    src={event.mainImage}
                                    alt={event.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                    
                    {/* Navigation Arrows */}
                    {events.length > 1 && (
                        <>
                            <button onClick={prevSlide} aria-label="Previous slide" className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 z-20 transition">
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <button onClick={nextSlide} aria-label="Next slide" className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 z-20 transition">
                                <ChevronRightIcon className="w-6 h-6" />
                            </button>
                        </>
                    )}

                    {/* Indicators */}
                    {events.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                            {events.map((_, index) => (
                                 <button
                                    key={index}
                                    onClick={() => goToSlide(index)}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-primary scale-125' : 'bg-white/50 hover:bg-white/80'}`}
                                    aria-label={`Go to slide ${index + 1}`}
                                 />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 text-text-secondary">
                    <h1 className="text-2xl font-bold">No hay eventos disponibles en este momento.</h1>
                    <p>Por favor, vuelve a consultar más tarde.</p>
                </div>
            )}


            <h2 className="text-3xl font-bold mb-6">Próximos Eventos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(event => (
                    <Link to={`/evento/${event.id}`} key={event.id} className="group bg-surface rounded-xl overflow-hidden shadow-lg hover:shadow-primary/30 border border-border transition-all duration-300 transform hover:-translate-y-1">
                        <div className="relative h-48">
                            <img src={event.mainImage} alt={event.name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors"></div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">{event.name}</h3>
                            <p className="text-text-secondary mt-1">{new Date(event.date).toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })} - {event.time} hs</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

// SVG Icon Components
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
);
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
);

export default UserHome;