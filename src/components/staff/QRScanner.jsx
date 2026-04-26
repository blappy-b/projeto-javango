'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CheckCircle, XCircle, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

export default function QRScanner({ eventId }) {
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error' | 'already_used'
  const [message, setMessage] = useState('');
  const [ticketInfo, setTicketInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const resetScanner = useCallback(() => {
    setScanResult(null);
    setMessage('');
    setTicketInfo(null);
    setCameraError(null);
    
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (scanResult || loading) return;

    const initScanner = async () => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            videoConstraints: { facingMode: { ideal: "environment" } }
          },
          false
        );

        scannerRef.current = scanner;

        const onScanSuccess = async (decodedText) => {
          if (loading || scanResult) return;
          
          scanner.pause();
          setLoading(true);

          try {
            const res = await fetch('/api/tickets/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qrToken: decodedText, eventId })
            });

            const data = await res.json();

            if (res.ok) {
              setScanResult('success');
              setMessage('Ingresso válido!');
              setTicketInfo({
                name: data.data?.owner || 'Participante',
                type: data.data?.type || 'Ingresso'
              });
              vibrate([100, 50, 100]);
            } else if (data.code === 'ALREADY_USED') {
              setScanResult('already_used');
              setMessage(data.message || 'Ingresso já utilizado');
              vibrate([300]);
            } else {
              setScanResult('error');
              setMessage(data.message || 'Ingresso inválido');
              vibrate([300]);
            }
          } catch (e) {
            setScanResult('error');
            setMessage('Erro de conexão');
            vibrate([300]);
          } finally {
            setLoading(false);
          }
        };

        const onScanError = () => {};

        scanner.render(onScanSuccess, onScanError);
      } catch (error) {
        setCameraError('Não foi possível acessar a câmera');
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [scanResult, loading, eventId]);

  const vibrate = (pattern) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Camera Error State
  if (cameraError) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Câmera Indisponível</h3>
        <p className="text-gray-400 text-sm mb-6">{cameraError}</p>
        <button
          onClick={resetScanner}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Result States
  if (scanResult) {
    const isSuccess = scanResult === 'success';
    const isAlreadyUsed = scanResult === 'already_used';

    return (
      <div className="p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
          isSuccess 
            ? 'bg-green-500/20' 
            : isAlreadyUsed 
              ? 'bg-yellow-500/20' 
              : 'bg-red-500/20'
        }`}>
          {isSuccess ? (
            <CheckCircle className="w-10 h-10 text-green-400" />
          ) : isAlreadyUsed ? (
            <AlertTriangle className="w-10 h-10 text-yellow-400" />
          ) : (
            <XCircle className="w-10 h-10 text-red-400" />
          )}
        </div>

        <h3 className={`text-xl font-bold mb-2 ${
          isSuccess ? 'text-green-400' : isAlreadyUsed ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {isSuccess ? 'Entrada Liberada!' : isAlreadyUsed ? 'Já Utilizado' : 'Inválido'}
        </h3>

        <p className="text-gray-300 mb-2">{message}</p>

        {ticketInfo && (
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6 mt-4">
            <p className="text-white font-semibold text-lg">{ticketInfo.name}</p>
            <p className="text-gray-400 text-sm">{ticketInfo.type}</p>
          </div>
        )}

        <button
          onClick={resetScanner}
          className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Escanear Outro
        </button>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-primary mx-auto mb-4" />
        <p className="text-white font-medium">Validando ingresso...</p>
      </div>
    );
  }

  // Scanner Active
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">
          Aponte a câmera para o QR Code do ingresso
        </p>
      </div>
      <div 
        id="qr-reader" 
        ref={containerRef}
        className="rounded-xl overflow-hidden [&_video]:rounded-xl"
      />
    </div>
  );
}