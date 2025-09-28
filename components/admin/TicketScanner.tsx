import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PurchasedTicket } from '../../types';

// Declaration for jsQR if TypeScript doesn't know about it from the global script
declare const jsQR: (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;

type ScanResult = {
    status: 'success' | 'warning' | 'error';
    message: string;
    ticket?: PurchasedTicket;
};

const TicketScanner = () => {
    const { validateTicket } = useAppContext();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    }, []);
    
    const startCamera = async () => {
        setScanResult(null);
        setError(null);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
                    await videoRef.current.play();
                    setIsScanning(true);
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                let message = "No se pudo acceder a la cámara. Asegúrate de haber otorgado los permisos necesarios.";
                if (err instanceof Error) {
                    if (err.name === "NotAllowedError") {
                        message = "Permiso para acceder a la cámara denegado. Por favor, habilita el permiso en la configuración de tu navegador.";
                    } else if (err.name === "NotFoundError") {
                        message = "No se encontró una cámara compatible en tu dispositivo.";
                    }
                }
                setError(message);
                setIsScanning(false);
            }
        } else {
             setError("Tu navegador no soporta el acceso a la cámara.");
        }
    };

    const tick = useCallback(() => {
        if (isScanning && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                try {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) {
                        stopCamera();
                        const result = validateTicket(code.data);
                        setScanResult({
                            status: result.success ? 'success' : (result.message.includes('utilizado') ? 'warning' : 'error'),
                            message: result.message,
                            ticket: result.ticket,
                        });
                    }
                } catch (e) {
                     console.error("Error scanning QR:", e);
                }
            }
        }
        if (isScanning) {
            requestAnimationFrame(tick);
        }
    }, [isScanning, stopCamera, validateTicket]);

    useEffect(() => {
        if (isScanning) {
            requestAnimationFrame(tick);
        }
        // Cleanup function
        return () => {
            stopCamera();
        };
    }, [isScanning, tick, stopCamera]);
    
    const resultColors = {
        success: 'bg-green-500/20 border-green-500 text-green-300',
        warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-300',
        error: 'bg-red-500/20 border-red-500 text-red-300',
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-text-primary">Escanear Tickets</h1>
            <div className="bg-surface rounded-xl p-6 border border-border max-w-2xl mx-auto">
                {!isScanning && !scanResult && (
                    <div className="text-center">
                        <p className="text-text-secondary mb-4">Presiona el botón para iniciar la cámara y escanear los códigos QR de los tickets.</p>
                        <button onClick={startCamera} className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-lg transition text-lg">
                            Iniciar Escáner
                        </button>
                    </div>
                )}
                
                {error && <p className="text-red-400 text-center p-4 bg-red-900/50 rounded-lg">{error}</p>}
                
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center mt-4" style={{ display: isScanning ? 'flex' : 'none' }}>
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-8 border-white/50 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)' }}></div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                {isScanning && <button onClick={stopCamera} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition">Cancelar</button>}

                {scanResult && (
                    <div className={`p-4 rounded-lg border ${resultColors[scanResult.status]}`}>
                        <h3 className="text-xl font-bold text-center mb-4">{scanResult.message}</h3>
                        {scanResult.ticket && (
                            <div className="text-sm space-y-2 bg-background/50 p-3 rounded-md">
                                <p><strong>Evento:</strong> {scanResult.ticket.eventName}</p>
                                <p><strong>Tipo:</strong> {scanResult.ticket.holderType}</p>
                                <p><strong>Asiento:</strong> {scanResult.ticket.seatInfo || 'N/A'}</p>
                                <p><strong>Código:</strong> {scanResult.ticket.ticketCode}</p>
                            </div>
                        )}
                         <button onClick={startCamera} className="w-full mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-2 rounded-lg transition">
                            Escanear Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketScanner;