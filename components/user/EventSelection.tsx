import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ShapeStatus, VenueShape, TicketType } from '../../types';

const SVG_VIEWBOX_WIDTH = 800;
const SVG_VIEWBOX_HEIGHT = 450;

type SelectedShape = VenueShape & { bookingChoice?: 'minTickets' | 'combo' };

const BookingOptionsModal = ({
  shape,
  ticketType,
  onSelect,
  onClose,
}: {
  shape: VenueShape;
  ticketType: TicketType;
  onSelect: (choice: 'minTickets' | 'combo') => void;
  onClose: () => void;
}) => {
  if (!ticketType.bookingConditions) return null;

  const { minTickets, combo } = ticketType.bookingConditions;
  const singleTicketPrice = ticketType.price + ticketType.fee - ticketType.discount;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-8 max-w-sm w-full border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center mb-2">Opciones de Reserva para {shape.label}</h2>
        <p className="text-text-secondary text-center mb-6">Elige cómo deseas reservar este lugar.</p>
        <div className="space-y-4">
          {minTickets?.enabled && (
            <button
              onClick={() => onSelect('minTickets')}
              className="w-full text-left bg-background hover:bg-border p-4 rounded-lg transition-colors border border-border"
            >
              <p className="font-bold text-text-primary">Reservar con {minTickets.quantity} tickets</p>
              <p className="text-sm text-text-secondary">Se añadirán {minTickets.quantity} tickets a tu compra.</p>
              <p className="text-lg font-bold text-primary mt-2">Total: ${(minTickets.quantity * singleTicketPrice).toFixed(2)}</p>
            </button>
          )}
          {combo?.enabled && (
            <button
              onClick={() => onSelect('combo')}
              className="w-full text-left bg-background hover:bg-border p-4 rounded-lg transition-colors border border-border"
            >
              <p className="font-bold text-text-primary">Reservar con "{combo.name}"</p>
              <p className="text-sm text-text-secondary">Compra este paquete especial.</p>
              <p className="text-lg font-bold text-primary mt-2">Total: ${combo.price.toFixed(2)}</p>
            </button>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-6 text-sm text-text-secondary hover:text-text-primary">Cancelar</button>
      </div>
    </div>
  );
};


const EventSelection = () => {
  const { eventId, ticketType: ticketTypeId } = useParams<{ eventId: string; ticketType: string }>();
  const { getEventById, addPendingPurchase, settings } = useAppContext();
  const navigate = useNavigate();

  const event = getEventById(eventId || '');
  const selectedTicketType = event?.ticketTypes.find(t => t.id === ticketTypeId);

  const [selectedShapes, setSelectedShapes] = useState<SelectedShape[]>([]);
  const [generalQuantity, setGeneralQuantity] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [bookingModalShape, setBookingModalShape] = useState<VenueShape | null>(null);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  
  const isSalesEnabled = useMemo(() => event?.salesEnabled ?? true, [event]);

  const shapesForTicketType = useMemo(() => {
    if (!event || !ticketTypeId) return [];
    return event.venueShapes.filter(s => s.ticketTypeId === ticketTypeId);
  }, [event, ticketTypeId]);
  
  const handleSelectBookingOption = (choice: 'minTickets' | 'combo') => {
    if (!bookingModalShape) return;
    const augmentedShape: SelectedShape = { ...bookingModalShape, bookingChoice: choice };
    setSelectedShapes(prev => [...prev, augmentedShape]);
    setBookingModalShape(null);
  };

  const handleShapeClick = (shape: VenueShape) => {
    if (!isSalesEnabled || shape.status !== ShapeStatus.AVAILABLE) return;

    const isSelected = selectedShapes.some(s => s.id === shape.id);
    if (isSelected) {
      setSelectedShapes(prev => prev.filter(s => s.id !== shape.id));
      return;
    }
    
    const ticketTypeForShape = event?.ticketTypes.find(t => t.id === shape.ticketTypeId);
    const conditions = ticketTypeForShape?.bookingConditions;
    const hasConditions = conditions && (conditions.minTickets?.enabled || conditions.combo?.enabled);

    if (hasConditions) {
        setBookingModalShape(shape);
    } else {
        setSelectedShapes(prev => [...prev, shape]);
    }
  };
  
  const totalPrice = useMemo(() => {
      if (!selectedTicketType || !event) return 0;
      if (shapesForTicketType.length === 0) {
        return generalQuantity * (selectedTicketType.price + selectedTicketType.fee - selectedTicketType.discount);
      }
      return selectedShapes.reduce((total, shape) => {
        const ticketType = event.ticketTypes.find(t => t.id === shape.ticketTypeId);
        if (!ticketType) return total;
        
        if (shape.bookingChoice === 'combo' && ticketType.bookingConditions?.combo?.enabled) {
            return total + ticketType.bookingConditions.combo.price;
        }
        if (shape.bookingChoice === 'minTickets' && ticketType.bookingConditions?.minTickets?.enabled) {
            const quantity = ticketType.bookingConditions.minTickets.quantity;
            const singlePrice = ticketType.price + ticketType.fee - ticketType.discount;
            return total + (quantity * singlePrice);
        }
        
        // Default case (single seat, or table as a whole)
        const pricePerSeat = ticketType.price + ticketType.fee - ticketType.discount;
        const numSeats = ticketType.groupSize || 1;
        return total + (pricePerSeat * numSeats);
      }, 0);
  }, [selectedShapes, generalQuantity, selectedTicketType, event, shapesForTicketType]);

  const handleInitiatePurchase = () => {
    const showMap = shapesForTicketType.length > 0;
    const totalItems = showMap ? selectedShapes.length : generalQuantity;
    if (totalItems > 0) {
      setIsPaymentModalOpen(true);
    } else {
      alert('Por favor, selecciona al menos un ticket.');
    }
  };
  
  const handleRequestPurchaseVerification = () => {
    if (!event || !selectedTicketType) return;
    const showMap = shapesForTicketType.length > 0;

    const purchaseData = {
        eventId: event.id,
        ticketTypeId: selectedTicketType.id,
        selectedShapes: showMap ? selectedShapes.map(s => ({ shapeId: s.id, bookingChoice: s.bookingChoice })) : [],
        generalQuantity: showMap ? 0 : generalQuantity,
        totalPrice,
    };

    addPendingPurchase(purchaseData);
    setIsPaymentModalOpen(false);
    setIsAwaitingApproval(true);
  };

  const getShapeStyle = (shape: VenueShape) => {
    const isSelected = selectedShapes.some(s => s.id === shape.id);
    
    let fill = '#9ca3af'; // Gray-400 (Not selectable, different sector)
    let cursor = 'default';
    let opacity = 0.3;

    if (shape.ticketTypeId === ticketTypeId) {
        opacity = 1.0;
        if (isSelected) {
            fill = '#22c55e'; // Green-500
            cursor = 'pointer';
        } else if (shape.status === ShapeStatus.AVAILABLE) {
            fill = isSalesEnabled ? '#4ade80' : '#6b7280'; // Green-400 or Gray-500
            cursor = isSalesEnabled ? 'pointer' : 'not-allowed';
        } else if (shape.status === ShapeStatus.RESERVED) {
            fill = '#facc15'; // Yellow-400
            cursor = 'not-allowed';
        } else if (shape.status === ShapeStatus.SOLD) {
            fill = '#ef4444'; // Red-500
            cursor = 'not-allowed';
        }
    }

    return { fill, cursor, opacity };
  }

  const renderShape = useCallback((shape: VenueShape) => {
    const style = getShapeStyle(shape);
    const isClickable = style.cursor === 'pointer';
    
    const commonProps = {
      onClick: isClickable ? () => handleShapeClick(shape) : undefined,
      style,
      stroke: "#111827",
      strokeWidth: "1",
      className: isClickable ? "transition-colors duration-200" : ""
    };

     const textProps = {
        fontSize: shape.type === 'polygon' ? 16 : 10,
        fill: "white",
        fontWeight: "bold",
        textAnchor: "middle" as const,
        alignmentBaseline: "middle" as const,
        pointerEvents: "none" as const,
    };
    
    const groupKey = `shape-group-${shape.id}`;

    switch (shape.type) {
      case 'rect':
        return <g key={groupKey}><rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} /><text {...textProps} x={shape.x + shape.width/2} y={shape.y + shape.height/2}>{shape.label}</text></g>;
      case 'circle':
        return <g key={groupKey}><circle cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} /><text {...textProps} x={shape.cx} y={shape.cy}>{shape.label}</text></g>;
      case 'polygon':
        const pointsString = shape.points.map(p => `${p.x},${p.y}`).join(' ');
        const centroid = shape.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        centroid.x /= shape.points.length;
        centroid.y /= shape.points.length;
        return <g key={groupKey}><polygon points={pointsString} {...commonProps} /><text {...textProps} x={centroid.x} y={centroid.y}>{shape.label}</text></g>;
      default:
        return null;
    }
  }, [selectedShapes, ticketTypeId, isSalesEnabled]);

  if (!event || !selectedTicketType) return <div>Evento o tipo de ticket no encontrado.</div>;

  const showMap = shapesForTicketType.length > 0;
  
  const bookingModalTicketType = event?.ticketTypes.find(t => t.id === bookingModalShape?.ticketTypeId);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={`/evento/${eventId}`} className="text-primary hover:underline mb-4 inline-block">&larr; Volver al evento</Link>
        <h1 className="text-3xl font-bold">Selecciona tus tickets para: <span className="text-accent">{selectedTicketType.name}</span></h1>

        <div className="flex flex-col lg:flex-row gap-8 mt-6">
            <div className="lg:w-2/3">
                <h2 className="text-xl font-semibold mb-4">{showMap ? 'Mapa del Lugar' : 'Cantidad de Tickets'}</h2>
                 {showMap ? (
                    <>
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border">
                           <svg viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`} className="w-full h-full">
                              {event.venueMapImage && <image href={event.venueMapImage} x="0" y="0" width={SVG_VIEWBOX_WIDTH} height={SVG_VIEWBOX_HEIGHT} opacity="0.5" />}
                              {event.venueShapes.map(renderShape)}
                           </svg>
                        </div>
                         <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                            <div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2 bg-green-400"></span><span className="text-sm text-text-secondary">Disponible</span></div>
                            <div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2 bg-green-500"></span><span className="text-sm text-text-secondary">Seleccionado</span></div>
                            <div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2 bg-yellow-400"></span><span className="text-sm text-text-secondary">Reservado</span></div>
                            <div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2 bg-red-500"></span><span className="text-sm text-text-secondary">Vendido</span></div>
                            <div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2 bg-gray-400 opacity-30"></span><span className="text-sm text-text-secondary">Otro Sector</span></div>
                         </div>
                    </>
                 ) : (
                    <div className="bg-surface rounded-lg p-8 text-center text-text-secondary border border-border">
                        <p className="mb-4">Este sector no tiene mapa de asientos. La ubicación es por orden de llegada.</p>
                        <div className="flex items-center justify-center gap-4">
                            <label htmlFor="quantity" className="font-semibold text-text-primary">Cantidad:</label>
                            <input
                                type="number"
                                id="quantity"
                                value={generalQuantity}
                                onChange={(e) => setGeneralQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                min="1"
                                className="bg-background border border-border rounded-lg p-2 w-24 text-center disabled:opacity-50"
                                disabled={!isSalesEnabled}
                            />
                        </div>
                    </div>
                 )}
            </div>
            <div className="lg:w-1/3">
                <div className="bg-surface rounded-2xl p-6 border border-border sticky top-24">
                    <h2 className="text-2xl font-bold mb-4">Tu Selección</h2>
                     {!isSalesEnabled && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4 text-center" role="alert">
                            La venta de tickets se encuentra cerrada.
                        </div>
                    )}
                    { (showMap && selectedShapes.length === 0) || (!showMap && generalQuantity === 0) ? (
                        <p className="text-text-secondary">
                            {showMap 
                                ? `Selecciona un lugar disponible del sector ${selectedTicketType.name} en el mapa.`
                                : 'Selecciona la cantidad de tickets que deseas comprar.'
                            }
                        </p>
                    ) : (
                        <>
                            {showMap ? (
                                <ul className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                                    {selectedShapes.map(s => {
                                        const ticketTypeForSummary = event.ticketTypes.find(tt => tt.id === s.ticketTypeId);
                                        if (!ticketTypeForSummary) return null;

                                        let label = `Lugar: ${s.label}`;
                                        let price = (ticketTypeForSummary.price + ticketTypeForSummary.fee - ticketTypeForSummary.discount) * (ticketTypeForSummary.groupSize || 1);
                                        
                                        if(s.bookingChoice === 'combo' && ticketTypeForSummary.bookingConditions?.combo) {
                                            label = `${s.label} (${ticketTypeForSummary.bookingConditions.combo.name})`;
                                            price = ticketTypeForSummary.bookingConditions.combo.price;
                                        } else if (s.bookingChoice === 'minTickets' && ticketTypeForSummary.bookingConditions?.minTickets) {
                                            const quantity = ticketTypeForSummary.bookingConditions.minTickets.quantity;
                                            label = `${s.label} (${quantity} tickets)`;
                                            price = quantity * (ticketTypeForSummary.price + ticketTypeForSummary.fee - ticketTypeForSummary.discount);
                                        } else if (ticketTypeForSummary.groupSize) {
                                            label = `${s.label} (${ticketTypeForSummary.groupSize} personas)`;
                                        }
                                        return (
                                        <li key={s.id} className="flex justify-between items-center bg-background p-2 rounded">
                                            <span className="font-semibold text-accent">{label}</span>
                                            <span className="font-semibold">${price.toFixed(2)}</span>
                                        </li>
                                    )})}
                                </ul>
                            ) : (
                                <div className="bg-background p-2 rounded mb-4">
                                  <div className="flex justify-between items-center">
                                    <span>{generalQuantity} x <span className="font-semibold text-accent">{selectedTicketType.name}</span></span>
                                    <span className="font-semibold">${(generalQuantity * (selectedTicketType.price + selectedTicketType.fee - selectedTicketType.discount)).toFixed(2)}</span>
                                  </div>
                                </div>
                            )}
                            <div className="border-t border-border pt-4">
                                <div className="flex justify-between items-center text-xl font-bold">
                                    <span>Total:</span>
                                    <span>${totalPrice.toFixed(2)}</span>
                                </div>
                                <button onClick={handleInitiatePurchase} className="w-full mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={!isSalesEnabled}>
                                    Comprar Ahora
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
        
        {isPaymentModalOpen && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                <div className="bg-surface rounded-2xl p-8 max-w-sm w-full border border-border shadow-2xl">
                    <h2 className="text-2xl font-bold text-center mb-2">Realizar Pago</h2>
                    <p className="text-text-secondary text-center mb-4">Escanea el código QR con tu app de pagos para completar la compra.</p>
                    <div className="flex justify-center my-6">
                       {settings.paymentQrCodeUrl ? (
                           <img 
                                src={settings.paymentQrCodeUrl} 
                                alt="Código QR de pago" 
                                className="rounded-lg border-4 border-white bg-white w-52 h-52 object-contain"
                            />
                       ) : (
                            <div className="w-52 h-52 flex items-center justify-center bg-background rounded-lg border border-border">
                                <p className="text-text-secondary text-center text-sm p-4">El administrador no ha configurado un QR de pago.</p>
                            </div>
                       )}
                    </div>
                    <div className="text-center text-3xl font-bold mb-6">
                        ${totalPrice.toFixed(2)}
                    </div>
                    <div className="space-y-3">
                        <button 
                            onClick={handleRequestPurchaseVerification}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:hover:scale-100"
                            disabled={!settings.paymentQrCodeUrl}
                        >
                            He Realizado el Pago y Solicito Verificación
                        </button>
                        <button
                            onClick={() => setIsPaymentModalOpen(false)}
                            className="w-full bg-background hover:bg-border text-text-secondary font-bold py-2 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isAwaitingApproval && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-surface rounded-2xl p-8 max-w-sm w-full text-center border border-border shadow-2xl">
                    <h2 className="text-2xl font-bold mb-4">Solicitud Enviada</h2>
                    <p className="text-text-secondary mb-6">Tu compra está pendiente de aprobación por parte del administrador. Tus lugares han sido reservados temporalmente.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        )}

        {bookingModalShape && bookingModalTicketType && (
            <BookingOptionsModal
                shape={bookingModalShape}
                ticketType={bookingModalTicketType}
                onSelect={handleSelectBookingOption}
                onClose={() => setBookingModalShape(null)}
            />
        )}
    </div>
  );
};

export default EventSelection;