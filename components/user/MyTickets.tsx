import React, { useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PurchasedTicket } from '../../types';

// FIX: Changed to React.FC to correctly type as a component, resolving issues with the 'key' prop.
const Ticket: React.FC<{ ticket: PurchasedTicket }> = ({ ticket }) => {
    const eventDate = new Date(ticket.eventDate);
    const day = eventDate.getUTCDate();
    const month = eventDate.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
    const year = eventDate.getUTCFullYear();
    const ticketRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        const ticketElement = ticketRef.current;
        if (!ticketElement) return;

        const onAfterPrint = () => {
            ticketElement.classList.remove('printable-ticket');
            window.removeEventListener('afterprint', onAfterPrint);
        };

        window.addEventListener('afterprint', onAfterPrint);
        ticketElement.classList.add('printable-ticket');
        window.print();
    };


    return (
        <div>
            <div ref={ticketRef}>
                <div 
                    className="p-4 rounded-3xl max-w-sm mx-auto shadow-2xl"
                    style={{ backgroundColor: ticket.ticketDesign.brandColor }}
                >
                    <div className="flex justify-center items-center h-10 mb-4">
                         {ticket.ticketDesign.brandLogoUrl ? (
                            <img src={ticket.ticketDesign.brandLogoUrl} alt="Brand Logo" className="h-6" />
                        ) : (
                            <span className="text-white text-2xl font-bold">clicket.</span>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl text-gray-800 shadow-lg relative overflow-hidden">
                        {ticket.status === 'USED' && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                                <span className="text-white text-4xl font-black transform -rotate-12 border-4 border-white p-4 rounded-lg bg-black/50">UTILIZADO</span>
                            </div>
                        )}

                        {/* Header Image */}
                        <div className="relative">
                            <img src={ticket.headerImage} alt={ticket.eventName} className="w-full h-auto" />
                            <div className="absolute top-0 right-0 bg-white/80 p-2 text-center rounded-bl-lg">
                                <div className="text-xl font-bold text-purple-700">{day}</div>
                                <div className="text-xs font-semibold text-purple-700">{month}</div>
                                <div className="text-xs text-gray-500">{year}</div>
                            </div>
                        </div>

                        {/* Warnings */}
                        <div className="bg-gray-800 text-white text-xs flex justify-around py-1.5">
                            <div className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v3a2 2 0 002 2h6a2 2 0 002-2v-3h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v3h6v-3z" clipRule="evenodd" /><path d="M9 9H5v3h4V9z" /></svg>
                                <span>No imprimir</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                <span>No sacar screenshot</span>
                            </div>
                        </div>
                        
                        {/* Wavy background for QR section */}
                        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-10">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M0,50 Q25,0 50,50 T100,50" stroke="none" fill="#A076F2" />
                                <path d="M0,60 Q25,10 50,60 T100,60" stroke="none" fill="#A076F2" />
                            </svg>
                        </div>

                        <div className="p-4 relative">
                            {/* Event Details */}
                            <div className="pb-4">
                                <h1 className="font-bold text-lg leading-tight">{ticket.eventName}</h1>
                                <div className="text-xs text-gray-600 mt-2 space-y-1.5">
                                    <p className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Viernes {day} de {eventDate.toLocaleString('es-ES', { month: 'long' })}, {year}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {ticket.eventLocation}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {ticket.eventTime}
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t-2 border-dashed border-gray-300 -mx-4"></div>

                            {/* QR Code Section */}
                            <div className="flex items-center pt-4">
                                <div className="w-2/3">
                                    <img src={ticket.qrCodeUrl} alt="QR Code" className="w-full max-w-[150px] h-auto rounded-lg border-4 border-white shadow-md"/>
                                </div>
                                <div className="w-1/3 text-right">
                                    <p className="text-xs text-gray-500">Código</p>
                                    <p className="text-xs font-mono text-gray-500 break-words mb-2">{ticket.ticketCode}</p>
                                    <p className="font-bold text-lg">{ticket.holderType}</p>
                                    {ticket.seatInfo && <p className="text-xs text-gray-500">{ticket.seatInfo}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Footer Logo */}
                        <div className="flex justify-center items-center py-2">
                            {ticket.ticketDesign.brandLogoUrl ? (
                                <img src={ticket.ticketDesign.brandLogoUrl} alt="Brand Logo" className="h-4 opacity-70" />
                            ) : (
                                <span className="text-gray-500 text-lg font-bold opacity-70">clicket.</span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center items-center h-10 mt-4">
                         {ticket.ticketDesign.brandLogoUrl ? (
                            <img src={ticket.ticketDesign.brandLogoUrl} alt="Brand Logo" className="h-6" />
                        ) : (
                            <span className="text-white text-2xl font-bold">clicket.</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex justify-center mt-4">
                 <button onClick={handleDownload} className="download-button bg-surface hover:bg-border text-text-primary font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                    <DownloadIcon className="w-5 h-5" />
                    Descargar
                 </button>
            </div>
        </div>
    );
};

const MyTickets = () => {
    const { purchasedTickets } = useAppContext();

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-8">Mis Tickets</h1>
            
            {purchasedTickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {purchasedTickets.map(ticket => (
                        <Ticket key={ticket.id} ticket={ticket} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-text-secondary bg-surface rounded-lg">
                    <h2 className="text-xl font-semibold">No tienes tickets comprados.</h2>
                    <p>Cuando compres un ticket para un evento, aparecerá aquí.</p>
                </div>
            )}
        </div>
    );
};

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);


export default MyTickets;