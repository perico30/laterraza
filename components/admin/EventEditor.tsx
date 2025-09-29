import React, { useState, useRef, MouseEvent, useMemo, useCallback, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Event, TicketType, ShapeStatus, VenueShape, ShapeType, RectShape, CircleShape, PolygonShape, BookingConditionMinTickets, BookingConditionCombo } from '../../types';
import { uploadFile, db } from '../../firebase/config';
import { doc, collection } from 'firebase/firestore';

interface EventEditorProps {
  event: Event | null;
  onClose: () => void;
}

const COLOR_PALETTE = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'];
const SVG_VIEWBOX_WIDTH = 800;
const SVG_VIEWBOX_HEIGHT = 450;
const RESIZE_HANDLE_SIZE = 8;

type DragState = {
  shapeId: string;
  interaction: 'move' | 'resize';
  handle: string | null; // e.g., 'top-left', 'bottom-right', 'vertex-2'
  startMousePos: { x: number; y: number };
  originalShape: VenueShape;
};

const EventEditor: React.FC<EventEditorProps> = ({ event, onClose }) => {
  const { addEvent, updateEvent } = useAppContext();
  
  // Generate a stable ID for new events upfront to ensure uploads are associated correctly.
  const [eventId] = useState(() => event?.id || doc(collection(db, 'events')).id);

  const [formData, setFormData] = useState<Event>(
    event || {
      id: eventId,
      name: '', date: '', time: '', description: '', mainImage: '',
      carouselImages: [],
      ticketTypes: [{ id: `ticket-${Date.now()}`, name: '', price: 0, fee: 0, discount: 0, courtesy: false, color: COLOR_PALETTE[0] }],
      venueMapImage: null,
      venueShapes: [],
      reservationDetails: '',
      location: '',
      salesEnabled: true,
      ticketDesign: {
        brandColor: '#f59e0b',
        headerImageUrl: null,
        brandLogoUrl: null,
      }
    }
  );
  
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [selectedTicketTypeForShape, setSelectedTicketTypeForShape] = useState<string>(formData.ticketTypes[0]?.id || '');
  const [drawingMode, setDrawingMode] = useState<ShapeType | 'preset-round-table-4p' | 'preset-square-table-4p' | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editingTicketTypeOptions, setEditingTicketTypeOptions] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  const selectedShape = useMemo(() => 
    formData.venueShapes.find(s => s.id === selectedShapeId),
    [selectedShapeId, formData.venueShapes]
  );

  const ticketTypeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    formData.ticketTypes.forEach((tt) => {
        map.set(tt.id, tt.color);
    });
    return map;
  }, [formData.ticketTypes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleTicketTypeChange = (index: number, field: keyof TicketType, value: string | number | boolean) => {
    const newTicketTypes = [...formData.ticketTypes];
    const ticket = {...newTicketTypes[index]};

    if (field === 'courtesy') {
      ticket.courtesy = value as boolean;
      if (ticket.courtesy) {
        ticket.price = 0; ticket.fee = 0; ticket.discount = 0;
      }
    } else {
       (ticket as any)[field] = value;
    }
     newTicketTypes[index] = ticket;
    setFormData(prev => ({...prev, ticketTypes: newTicketTypes}));
  };
  
  const addTicketType = () => {
    const newTicketType: TicketType = { 
        id: `ticket-${Date.now()}`, name: '', price: 0, fee: 0, discount: 0, courtesy: false, 
        color: COLOR_PALETTE[formData.ticketTypes.length % COLOR_PALETTE.length]
    };
    setFormData(prev => ({
        ...prev,
        ticketTypes: [...prev.ticketTypes, newTicketType]
    }));
  };

  const removeTicketType = (idToRemove: string) => {
    if (formData.ticketTypes.length <= 1) {
      alert("Debe haber al menos un sector.");
      return;
    }
    const isUsed = formData.venueShapes.some(shape => shape.ticketTypeId === idToRemove);
    if (isUsed) {
      alert("No se puede eliminar este sector porque ya hay lugares asignados a él en el mapa. Por favor, reasigne esos lugares a otro sector antes de eliminar este.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter(tt => tt.id !== idToRemove)
    }));
    if (editingTicketTypeOptions === idToRemove) {
        setEditingTicketTypeOptions(null);
    }
  };

  const getSVGCoordinates = useCallback((e: MouseEvent): {x: number, y: number} => {
    if (!svgRef.current) return {x: 0, y: 0};
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  }, []);

  const handleSvgMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (!drawingMode) {
      if (e.target === e.currentTarget) setSelectedShapeId(null);
      return;
    }
    if (!isEditingMap || !selectedTicketTypeForShape) return;
    const { x, y } = getSVGCoordinates(e);
    if (drawingMode === 'polygon') {
      setPolygonPoints(prev => [...prev, { x, y }]);
      return;
    }
    const newShapes: VenueShape[] = [];
    const uniqueId = Date.now();
    switch (drawingMode) {
      case 'rect': newShapes.push({ id: `rect-${uniqueId}`, label: 'Asiento', type: 'rect', x: x - 10, y: y - 10, width: 20, height: 20, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE }); break;
      case 'circle': newShapes.push({ id: `circle-${uniqueId}`, label: 'Mesa', type: 'circle', cx: x, cy: y, r: 15, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE }); break;
      case 'preset-round-table-4p': {
        const tableRadius = 25, seatRadius = 8, distance = tableRadius + seatRadius + 5;
        newShapes.push({ id: `circle-T-${uniqueId}`, label: 'Mesa', type: 'circle', cx: x, cy: y, r: tableRadius, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `circle-S1-${uniqueId}`, label: 'S1', type: 'circle', cx: x, cy: y - distance, r: seatRadius, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `circle-S2-${uniqueId}`, label: 'S2', type: 'circle', cx: x + distance, cy: y, r: seatRadius, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `circle-S3-${uniqueId}`, label: 'S3', type: 'circle', cx: x, cy: y + distance, r: seatRadius, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `circle-S4-${uniqueId}`, label: 'S4', type: 'circle', cx: x - distance, cy: y, r: seatRadius, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        break;
      }
      case 'preset-square-table-4p': {
        const tableSize = 40, seatSize = 15, distance = tableSize / 2 + seatSize / 2 + 5;
        newShapes.push({ id: `rect-T-${uniqueId}`, label: 'Mesa', type: 'rect', x: x - tableSize/2, y: y - tableSize/2, width: tableSize, height: tableSize, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `rect-S1-${uniqueId}`, label: 'S1', type: 'rect', x: x - seatSize/2, y: y - distance - seatSize/2, width: seatSize, height: seatSize, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `rect-S2-${uniqueId}`, label: 'S2', type: 'rect', x: x + distance - seatSize/2, y: y - seatSize/2, width: seatSize, height: seatSize, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `rect-S3-${uniqueId}`, label: 'S3', type: 'rect', x: x - seatSize/2, y: y + distance - seatSize/2, width: seatSize, height: seatSize, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        newShapes.push({ id: `rect-S4-${uniqueId}`, label: 'S4', type: 'rect', x: x - distance - seatSize/2, y: y - seatSize/2, width: seatSize, height: seatSize, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE });
        break;
      }
    }
    if (newShapes.length > 0) setFormData(prev => ({ ...prev, venueShapes: [...prev.venueShapes, ...newShapes] }));
    setDrawingMode(null);
  };

  const handleSvgMouseUp = () => { if (dragState) setDragState(null); };

  const finishPolygon = () => {
    if (polygonPoints.length < 3) {
      alert("Un polígono necesita al menos 3 puntos.");
      setPolygonPoints([]); setDrawingMode(null); return;
    }
    const newShape: VenueShape = { id: `polygon-zona-${Date.now()}`, label: 'Zona', type: 'polygon', points: polygonPoints, ticketTypeId: selectedTicketTypeForShape, status: ShapeStatus.AVAILABLE };
    setFormData(prev => ({ ...prev, venueShapes: [...prev.venueShapes, newShape] }));
    setPolygonPoints([]); setDrawingMode(null);
  };
  
  const handleFileUpload = async (file: File, field: keyof Event | `ticketDesign.${'headerImageUrl' | 'brandLogoUrl'}`) => {
      setIsUploading(true);
      try {
          const currentEventId = formData.id; // Use the stable ID from state
          const filePath = `events/${currentEventId}/${field.replace('.', '_')}-${Date.now()}-${file.name}`;
          const downloadURL = await uploadFile(file, filePath);
          
          if (field.startsWith('ticketDesign.')) {
              const subField = field.split('.')[1] as 'headerImageUrl' | 'brandLogoUrl';
              setFormData(prev => ({ ...prev, ticketDesign: { ...prev.ticketDesign, [subField]: downloadURL } }));
          } else if (field === 'carouselImages') {
              setFormData(prev => ({ ...prev, carouselImages: [...prev.carouselImages, downloadURL]}));
          } else {
              setFormData(prev => ({ ...prev, [field]: downloadURL }));
          }
      } catch (error: any) {
          console.error("Error uploading file:", error);
          let errorMessage = "Error al subir el archivo. Inténtalo de nuevo.";
          if (error.code) {
            switch (error.code) {
              case 'storage/unauthorized':
                errorMessage = "Error: No tienes permiso para subir archivos. Revisa que hayas iniciado sesión y que las reglas de seguridad de Firebase Storage sean correctas.";
                break;
              case 'storage/canceled':
                errorMessage = "La subida del archivo fue cancelada.";
                break;
              case 'storage/unknown':
                errorMessage = "Ocurrió un error desconocido. Esto puede deberse a un problema de CORS. Asegúrate de que el dominio de tu aplicación Vercel esté permitido en la configuración de CORS de tu bucket de Firebase Storage.";
                break;
              default:
                errorMessage = `Error al subir el archivo: ${error.message} (código: ${error.code})`;
            }
          }
          alert(errorMessage);
      } finally {
          setIsUploading(false);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Event | `ticketDesign.${'headerImageUrl' | 'brandLogoUrl'}`) => {
    if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0], field);
        e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // With the stable ID and upsert logic in updateEvent, we can use it for both creating and editing.
    await updateEvent(formData);
    onClose();
  };
  
  const handleShapeInteractionStart = useCallback((e: MouseEvent, shape: VenueShape, interaction: 'move' | 'resize' = 'move', handle: string | null = null) => {
    if (!isEditingMap || drawingMode) return;
    e.stopPropagation();
    setSelectedShapeId(shape.id);
    const startMousePos = getSVGCoordinates(e);
    setDragState({ shapeId: shape.id, interaction, handle, startMousePos, originalShape: shape });
  }, [isEditingMap, drawingMode, getSVGCoordinates]);
  
  const handleSvgMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!dragState) return;
    
    const { x, y } = getSVGCoordinates(e);
    const dx = x - dragState.startMousePos.x;
    const dy = y - dragState.startMousePos.y;

    const updatedShapes = formData.venueShapes.map(shape => {
      if (shape.id !== dragState.shapeId) return shape;
      const { originalShape } = dragState;
      if (dragState.interaction === 'move') {
          switch(originalShape.type) {
              case 'rect': return { ...originalShape, x: originalShape.x + dx, y: originalShape.y + dy };
              case 'circle': return { ...originalShape, cx: originalShape.cx + dx, cy: originalShape.cy + dy };
              case 'polygon': return { ...originalShape, points: originalShape.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          }
      } else { // resize
          switch(originalShape.type) {
            case 'rect':
                let { x: newX, y: newY, width: newW, height: newH } = originalShape;
                if (dragState.handle?.includes('bottom')) newH = Math.max(10, originalShape.height + dy);
                if (dragState.handle?.includes('top')) { newH = Math.max(10, originalShape.height - dy); newY = originalShape.y + dy; }
                if (dragState.handle?.includes('right')) newW = Math.max(10, originalShape.width + dx);
                if (dragState.handle?.includes('left')) { newW = Math.max(10, originalShape.width - dx); newX = originalShape.x + dx; }
                return { ...originalShape, x: newX, y: newY, width: newW, height: newH };
            case 'circle':
                const dist = Math.sqrt(Math.pow(x - originalShape.cx, 2) + Math.pow(y - originalShape.cy, 2));
                return {...originalShape, r: Math.max(5, dist)};
            case 'polygon':
                if (dragState.handle?.startsWith('vertex-')) {
                    const index = parseInt(dragState.handle.split('-')[1], 10);
                    const newPoints = [...originalShape.points];
                    newPoints[index] = { x: newPoints[index].x + dx, y: newPoints[index].y + dy };
                    return { ...originalShape, points: newPoints };
                }
          }
      }
      return shape;
    });
    setFormData(prev => ({...prev, venueShapes: updatedShapes as VenueShape[]}));
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingMap && selectedShapeId && (e.key === 'Delete' || e.key === 'Backspace')) {
          setFormData(prev => ({...prev, venueShapes: prev.venueShapes.filter(s => s.id !== selectedShapeId)}));
          setSelectedShapeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingMap, selectedShapeId]);
  
  const updateSelectedShape = (field: 'label' | 'ticketTypeId', value: string) => {
      if (!selectedShapeId) return;
      const updatedShapes = formData.venueShapes.map(s => s.id === selectedShapeId ? {...s, [field]: value} : s);
      setFormData(prev => ({...prev, venueShapes: updatedShapes}));
  };
  
  const handleTicketTypeBookingConditionsChange = (
    ticketTypeId: string,
    field: 'minTickets' | 'combo', 
    subField: keyof BookingConditionMinTickets | keyof BookingConditionCombo, 
    value: any
) => {
    setFormData(prev => ({
        ...prev,
        ticketTypes: prev.ticketTypes.map(tt => {
            if (tt.id !== ticketTypeId) return tt;
            const conditions = JSON.parse(JSON.stringify(tt.bookingConditions || {}));
            const fieldCondition = conditions[field] || { enabled: false };
            if (typeof value === 'number' && isNaN(value)) value = 0;
            const newFieldCondition = { ...fieldCondition, [subField]: value };
            if (subField === 'enabled' && value === false) {
                delete conditions[field];
                if(Object.keys(conditions).length === 0) {
                     const { bookingConditions, ...rest } = tt;
                     return rest;
                }
                return { ...tt, bookingConditions: conditions };
            }
            return { ...tt, bookingConditions: { ...conditions, [field]: newFieldCondition } };
        }),
    }));
};

  const renderResizeHandles = useCallback((shape: VenueShape) => {
    const commonProps = { fill: "#fff", stroke: "#7c3aed", strokeWidth: 1, width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE };
    const hs = RESIZE_HANDLE_SIZE / 2;
    if (shape.type === 'rect') {
        const handles = [
            { id: 'top-left', x: shape.x - hs, y: shape.y - hs, cursor: 'nwse-resize' },
            { id: 'top-right', x: shape.x + shape.width - hs, y: shape.y - hs, cursor: 'nesw-resize' },
            { id: 'bottom-left', x: shape.x - hs, y: shape.y + shape.height - hs, cursor: 'nesw-resize' },
            { id: 'bottom-right', x: shape.x + shape.width - hs, y: shape.y + shape.height - hs, cursor: 'nwse-resize' },
        ];
        return handles.map(h => <rect key={h.id} {...h} {...commonProps} onMouseDown={e => handleShapeInteractionStart(e, shape, 'resize', h.id)} />);
    }
    if (shape.type === 'circle') {
        const handle = { id: 'br-corner', cx: shape.cx + shape.r/Math.sqrt(2), cy: shape.cy + shape.r/Math.sqrt(2), cursor: 'nwse-resize'};
        return <circle key={handle.id} {...handle} r={hs} fill="#fff" stroke="#7c3aed" onMouseDown={e => handleShapeInteractionStart(e, shape, 'resize', handle.id)} />;
    }
    if (shape.type === 'polygon') {
        return shape.points.map((p, i) => <circle key={`vertex-${i}`} cx={p.x} cy={p.y} r={hs} fill="#fff" stroke="#7c3aed" style={{cursor: 'move'}} onMouseDown={e => handleShapeInteractionStart(e, shape, 'resize', `vertex-${i}`)} />);
    }
    return null;
  }, [handleShapeInteractionStart]);
  
  const renderEditableShape = useCallback((shape: VenueShape) => {
    const color = ticketTypeColorMap.get(shape.ticketTypeId) || '#ffffff';
    const isInteractive = isEditingMap && !drawingMode;
    const isSelected = isInteractive && selectedShapeId === shape.id;
    const commonProps = {
      onMouseDown: isInteractive ? (e: MouseEvent) => handleShapeInteractionStart(e, shape) : undefined,
      style: { cursor: isInteractive ? 'move' : 'default' },
      stroke: isSelected ? '#a78bfa' : "white", strokeWidth: isSelected ? 2 : 1, fill: color,
    };
    const textProps = { fontSize: shape.type === 'polygon' ? 16 : 10, fill: "white", fontWeight: 'bold', textAnchor: "middle" as const, alignmentBaseline: "middle" as const, pointerEvents: "none" as const };
    const getCentroid = (points: {x:number, y:number}[]) => {
      const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      centroid.x /= points.length; centroid.y /= points.length; return centroid;
    };
    return (
        <g key={shape.id}>
            {shape.type === 'rect' && <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />}
            {shape.type === 'circle' && <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} />}
            {shape.type === 'polygon' && <polygon points={shape.points.map(p => `${p.x},${p.y}`).join(' ')} {...commonProps} />}
            {shape.type === 'rect' && <text {...textProps} x={shape.x + shape.width/2} y={shape.y + shape.height/2}>{shape.label}</text>}
            {shape.type === 'circle' && <text {...textProps} x={shape.cx} y={shape.cy}>{shape.label}</text>}
            {shape.type === 'polygon' && <text {...textProps} {...getCentroid(shape.points)}>{shape.label}</text>}
            {isSelected && renderResizeHandles(shape)}
        </g>
    );
  }, [isEditingMap, selectedShapeId, ticketTypeColorMap, drawingMode, handleShapeInteractionStart, renderResizeHandles]);


  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-6 relative">
      {isUploading && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-xl">
          <p className="text-white font-bold text-lg animate-pulse">Subiendo imagen...</p>
        </div>
      )}
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{event ? 'Editar Evento' : 'Crear Nuevo Evento'}</h2>
             <div className="flex items-center space-x-3">
                <label htmlFor="salesEnabled" className="text-sm font-medium text-text-primary">Ventas Habilitadas</label>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="salesEnabled" name="salesEnabled" checked={formData.salesEnabled ?? true} onChange={e => setFormData(prev => ({ ...prev, salesEnabled: e.target.checked }))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>
        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del Evento" className="bg-background border border-border rounded-lg p-2 w-full" required />
        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descripción del Evento" className="bg-background border border-border rounded-lg p-2 w-full h-24" required />
        <input name="location" value={formData.location} onChange={handleChange} placeholder="Ubicación del Evento" className="bg-background border border-border rounded-lg p-2 w-full" />

        <div>
          <h3 className="font-semibold mb-2">Imágenes</h3>
          <label className="block text-sm font-medium text-text-secondary mb-1">Imagen Principal</label>
          <input type="file" onChange={(e) => handleFileChange(e, 'mainImage')} className="bg-background border border-border rounded-lg p-2 w-full" />
          {formData.mainImage && <img src={formData.mainImage} alt="Preview" className="mt-2 h-32 w-auto object-contain bg-background rounded-lg" />}
        </div>
        
        <div>
            <h3 className="font-semibold mb-2">Diseño del Ticket Digital</h3>
            <div className='p-4 bg-background rounded-lg border border-border space-y-4'>
                <div>
                    <label htmlFor="brandColor" className="block text-sm font-medium text-text-secondary mb-1">Color de Marca (fondo del ticket)</label>
                    <div className="flex items-center gap-2">
                        <input type="color" id="brandColor" name="brandColor" value={formData.ticketDesign.brandColor} onChange={e => setFormData(prev => ({ ...prev, ticketDesign: { ...prev.ticketDesign, brandColor: e.target.value } }))} className="p-1 h-10 w-10 block bg-background border border-border cursor-pointer rounded-lg" />
                        <input type="text" value={formData.ticketDesign.brandColor} onChange={e => setFormData(prev => ({ ...prev, ticketDesign: { ...prev.ticketDesign, brandColor: e.target.value } }))} name="brandColor" className="bg-surface border border-border rounded-lg p-2 w-full" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Imagen de cabecera del Ticket</label>
                    <input type="file" onChange={(e) => handleFileChange(e, 'ticketDesign.headerImageUrl')} className="bg-surface border border-border rounded-lg p-2 w-full" />
                    {formData.ticketDesign.headerImageUrl && <img src={formData.ticketDesign.headerImageUrl} alt="Preview" className="mt-2 h-24 w-auto object-contain bg-surface rounded-lg" />}
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Logo de Marca del Ticket (ej: 'clicket')</label>
                    <input type="file" onChange={(e) => handleFileChange(e, 'ticketDesign.brandLogoUrl')} className="bg-surface border border-border rounded-lg p-2 w-full" />
                    {formData.ticketDesign.brandLogoUrl && <img src={formData.ticketDesign.brandLogoUrl} alt="Preview" className="mt-2 h-10 w-auto object-contain bg-surface rounded-lg p-1" />}
                </div>
            </div>
        </div>

        <div>
            <h3 className="font-semibold mb-2">Sectores y Tickets</h3>
             {formData.ticketTypes.map((ticket, index) => (
                <div key={ticket.id} className="bg-background rounded-lg mb-2 border border-border">
                  <div className="grid grid-cols-12 gap-2 p-2 items-center">
                    <input type="color" value={ticket.color} onChange={e => handleTicketTypeChange(index, 'color', e.target.value)} className="bg-transparent h-8 w-8 p-0 border-0 rounded" />
                    <input value={ticket.name} onChange={e => handleTicketTypeChange(index, 'name', e.target.value)} placeholder="Ej: VIP, General" className="bg-surface border border-border rounded-lg p-2 col-span-3" />
                    <input type="number" value={ticket.price} onChange={e => handleTicketTypeChange(index, 'price', parseFloat(e.target.value))} placeholder="Precio" className="bg-surface border border-border rounded-lg p-2 col-span-2 disabled:opacity-50" disabled={ticket.courtesy} />
                    <input type="number" value={ticket.fee} onChange={e => handleTicketTypeChange(index, 'fee', parseFloat(e.target.value))} placeholder="Fee" className="bg-surface border border-border rounded-lg p-2 col-span-2 disabled:opacity-50" disabled={ticket.courtesy} />
                    <input type="number" value={ticket.discount} onChange={e => handleTicketTypeChange(index, 'discount', parseFloat(e.target.value))} placeholder="Desc." className="bg-surface border border-border rounded-lg p-2 col-span-1 disabled:opacity-50" disabled={ticket.courtesy} />
                    <div className="flex items-center justify-center col-span-1">
                      <label className="flex items-center space-x-2 text-xs text-text-secondary cursor-pointer">
                          <input type="checkbox" checked={ticket.courtesy} onChange={e => handleTicketTypeChange(index, 'courtesy', e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                          <span>Cort.</span>
                      </label>
                    </div>
                     <div className="col-span-1 flex justify-end items-center gap-1">
                       <button type="button" title="Opciones de Reserva" onClick={() => setEditingTicketTypeOptions(editingTicketTypeOptions === ticket.id ? null : ticket.id)} className={`p-1 rounded-full ${editingTicketTypeOptions === ticket.id ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                           <CogIcon className="w-5 h-5" />
                       </button>
                       <button type="button" title="Eliminar Sector" onClick={() => removeTicketType(ticket.id)} className="text-red-500 hover:text-red-400 p-1 rounded-full">
                           <TrashIcon className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                   {editingTicketTypeOptions === ticket.id && (
                     <div className="p-4 border-t border-border bg-surface/50">
                        <h5 className="font-semibold mb-3 text-text-primary text-sm">Condiciones de Reserva para "{ticket.name}"</h5>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer">
                                    <input type="checkbox" checked={ticket.bookingConditions?.minTickets?.enabled || false} onChange={e => handleTicketTypeBookingConditionsChange(ticket.id, 'minTickets', 'enabled', e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary bg-surface border-border" />
                                    <span>Requerir compra mínima de tickets</span>
                                </label>
                                {ticket.bookingConditions?.minTickets?.enabled && (
                                    <input type="number" value={ticket.bookingConditions.minTickets.quantity || ''} onChange={e => handleTicketTypeBookingConditionsChange(ticket.id, 'minTickets', 'quantity', parseInt(e.target.value, 10))} min="1" placeholder="Cantidad" className="bg-surface border border-border rounded-lg p-2 w-full text-sm mt-1" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer">
                                    <input type="checkbox" checked={ticket.bookingConditions?.combo?.enabled || false} onChange={e => handleTicketTypeBookingConditionsChange(ticket.id, 'combo', 'enabled', e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary bg-surface border-border"/>
                                    <span>Ofrecer compra como "Combo"</span>
                                </label>
                                {ticket.bookingConditions?.combo?.enabled && (
                                    <div className="space-y-2 pl-2 border-l-2 border-border ml-2">
                                        <input type="text" placeholder="Nombre Combo (ej: Combo VIP)" value={ticket.bookingConditions.combo.name || ''} onChange={e => handleTicketTypeBookingConditionsChange(ticket.id, 'combo', 'name', e.target.value)} className="bg-surface border border-border rounded-lg p-2 w-full text-sm" />
                                        <input type="number" placeholder="Precio Total del Combo" value={ticket.bookingConditions.combo.price || ''} onChange={e => handleTicketTypeBookingConditionsChange(ticket.id, 'combo', 'price', parseFloat(e.target.value))} min="0" step="0.01" className="bg-surface border border-border rounded-lg p-2 w-full text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                   )}
                </div>
            ))}
            <button type="button" onClick={addTicketType} className="text-primary hover:text-accent font-semibold mt-2">+ Añadir Sector</button>
        </div>
        <div>
            <h3 className="font-semibold mb-2">Croquis del Lugar (Mapa SVG)</h3>
            <label className="block text-sm font-medium text-text-secondary mb-1">Subir Croquis de Fondo (opcional)</label>
            <input type="file" onChange={(e) => handleFileChange(e, 'venueMapImage')} className="bg-background border border-border rounded-lg p-2 w-full mb-2" />
            <button type="button" onClick={() => setIsEditingMap(!isEditingMap)} className={`font-bold py-2 px-4 rounded-lg my-2 ${isEditingMap ? 'bg-red-600' : 'bg-primary'}`}>
                {isEditingMap ? 'Dejar de Editar Mapa' : 'Editar Mapa'}
            </button>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                    {isEditingMap && (
                        <div className="my-2 p-3 bg-background rounded-lg border border-border space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 text-text-primary">Herramientas</h4>
                                <label className="block text-xs font-medium text-text-secondary mb-2">1. Seleccione el sector para el nuevo lugar:</label>
                                <select value={selectedTicketTypeForShape} onChange={e => setSelectedTicketTypeForShape(e.target.value)} className="bg-surface border border-border rounded-lg p-2 w-full text-sm">
                                    <option value="" disabled>-- Elija un sector --</option>
                                    {formData.ticketTypes.map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-text-secondary mb-2">2. Seleccione un objeto y haga clic en el mapa para añadirlo:</p>
                                <div className="grid grid-cols-5 gap-2">
                                    <PaletteIcon title="Asiento" isActive={drawingMode === 'rect'} onClick={() => setDrawingMode('rect')}><SeatIcon/></PaletteIcon>
                                    <PaletteIcon title="Mesa Circular" isActive={drawingMode === 'circle'} onClick={() => setDrawingMode('circle')}><TableIcon/></PaletteIcon>
                                    <PaletteIcon title="Mesa Redonda (4p)" isActive={drawingMode === 'preset-round-table-4p'} onClick={() => setDrawingMode('preset-round-table-4p')}><RoundTablePresetIcon/></PaletteIcon>
                                    <PaletteIcon title="Mesa Cuadrada (4p)" isActive={drawingMode === 'preset-square-table-4p'} onClick={() => setDrawingMode('preset-square-table-4p')}><SquareTablePresetIcon/></PaletteIcon>
                                    <PaletteIcon title="Zona (Polígono)" isActive={drawingMode === 'polygon'} onClick={() => setDrawingMode('polygon')}><PolygonIcon/></PaletteIcon>
                                </div>
                                 {drawingMode === 'polygon' && (
                                    <div className="mt-2 text-xs text-accent">
                                        <p>Haz clic para añadir puntos. Haz doble clic en el lienzo para finalizar.</p>
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-text-secondary border-t border-border pt-2">
                                <p><strong className="text-text-primary">Editar:</strong> Clic en un lugar para seleccionar. Arrástralo para mover o usa los controles para cambiar tamaño.</p>
                                <p><strong className="text-text-primary">Eliminar:</strong> Selecciona un lugar y presiona 'Suprimir' o 'Retroceso'.</p>
                            </div>
                        </div>
                    )}
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2" style={{ cursor: drawingMode ? 'crosshair' : (dragState ? 'grabbing' : 'default'), borderColor: isEditingMap ? '#7c3aed' : 'transparent' }}>
                        <svg ref={svgRef} viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`} 
                            onMouseDown={handleSvgMouseDown} 
                            onMouseMove={handleSvgMouseMove}
                            onMouseUp={handleSvgMouseUp}
                            onDoubleClick={drawingMode === 'polygon' ? finishPolygon : undefined} className="w-full h-full select-none">
                            {formData.venueMapImage && <image href={formData.venueMapImage} x="0" y="0" width={SVG_VIEWBOX_WIDTH} height={SVG_VIEWBOX_HEIGHT} pointerEvents="none" />}
                            {formData.venueShapes.map(renderEditableShape)}
                            {drawingMode === 'polygon' && polygonPoints.length > 0 && (
                                <polyline points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="cyan" strokeDasharray="5,5" />
                            )}
                        </svg>
                    </div>
                </div>
                {isEditingMap && selectedShape && (
                    <div className="md:w-64 flex-shrink-0 p-4 bg-background rounded-lg border border-border self-start">
                        <h4 className="font-bold mb-3 text-text-primary">Propiedades del Lugar</h4>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="shapeLabel" className="block text-sm font-medium text-text-secondary mb-1">Etiqueta</label>
                                <input type="text" id="shapeLabel" value={selectedShape.label} onChange={e => updateSelectedShape('label', e.target.value)} className="bg-surface border border-border rounded-lg p-2 w-full text-sm" />
                            </div>
                             <div>
                                <label htmlFor="shapeTicketType" className="block text-sm font-medium text-text-secondary mb-1">Sector</label>
                                <select id="shapeTicketType" value={selectedShape.ticketTypeId} onChange={e => updateSelectedShape('ticketTypeId', e.target.value)} className="bg-surface border border-border rounded-lg p-2 w-full text-sm">
                                    {formData.ticketTypes.map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Leyenda de Sectores:</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {formData.ticketTypes.map(tt => (
                        <div key={tt.id} className="flex items-center">
                            <span className="w-4 h-4 rounded-full mr-2 border border-border" style={{ backgroundColor: ticketTypeColorMap.get(tt.id) }}></span>
                            <span className="text-sm text-text-secondary">{tt.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="bg-surface hover:bg-background text-text-primary font-bold py-2 px-4 rounded-lg transition">Cancelar</button>
            <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition">Guardar Evento</button>
        </div>
    </form>
  );
};

const PaletteIcon: React.FC<{ isActive: boolean; onClick: () => void; title: string; }> = ({ children, isActive, onClick, title }) => (
    <button type="button" onClick={onClick} title={title} className={`flex items-center justify-center p-2 rounded-lg transition-colors aspect-square ${isActive ? 'bg-accent text-white' : 'bg-surface hover:bg-border'}`} aria-pressed={isActive}>
        {children}
    </button>
);

const SeatIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
const TableIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>;
const PolygonIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"></path></svg>;
const RoundTablePresetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="6" /><circle cx="12" cy="3" r="2" /><circle cx="21" cy="12" r="2" /><circle cx="12" cy="21" r="2" /><circle cx="3" cy="12" r="2" />
    </svg>
);
const SquareTablePresetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="7" y="7" width="10" height="10" rx="1" /><rect x="10" y="1" width="4" height="4" rx="1" /><rect x="19" y="10" width="4" height="4" rx="1" /><rect x="10" y="19" width="4" height="4" rx="1" /><rect x="1" y="10" width="4" height="4" rx="1" />
    </svg>
);
const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m18 0h-1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v4.5m-4.5-2.25h9" /></svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

export default EventEditor;