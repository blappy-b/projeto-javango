'use client';
import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { createSupabaseBrowser } from '@/lib/supabase';
import { useDebug } from '@/components/debug/MobileDebugger';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null); // null, success, error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null); // Full error info for debugging
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const scannerRef = useRef(null);
  const debug = useDebug();

  useEffect(() => {
    if (isScanning || scanResult) return;

    let scanner = null;

    const initScanner = async () => {
      try {
        // Configuração da Lib com melhor suporte mobile
        scanner = new Html5QrcodeScanner(
          "reader", 
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            // Preferir câmera traseira em mobile
            videoConstraints: {
              facingMode: { ideal: "environment" }
            }
          },
          /* verbose= */ false
        );

        scannerRef.current = scanner;

        async function onScanSuccess(decodedText) {
          if (loading || scanResult) return; // Previne múltiplas leituras
          
          debug.log('QR Code detectado', { qrToken: decodedText.substring(0, 20) + '...' });
          scanner.pause();
          setLoading(true);

          try {
            const supabase = createSupabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              throw new Error('Usuário não autenticado');
            }

            debug.log('Validando ingresso...', { userId: user.id });

            // Chama nossa API
            const res = await fetch('/api/tickets/validate', {
              method: 'POST',
              body: JSON.stringify({ qrToken: decodedText }),
              headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            debug.log('Resposta da API', { status: res.status, data });

            if (res.ok) {
              setScanResult('success');
              setMessage(`${data.data.owner || 'Participante'} - ${data.data.type || 'Ingresso'}`);
              setErrorDetails(null);
              debug.success('Ingresso validado!', data.data);
              playSuccessSound();
            } else {
              setScanResult('error');
              setMessage(data.message || 'Ingresso inválido');
              setErrorDetails({
                type: 'API_ERROR',
                status: res.status,
                statusText: res.statusText,
                url: res.url,
                response: data,
                qrToken: decodedText,
                timestamp: new Date().toISOString()
              });
              debug.error('Ingresso inválido', data);
              playErrorSound();
            }
          } catch (e) {
            debug.error('Erro na validação', { message: e.message, stack: e.stack });
            setScanResult('error');
            setMessage('Erro de conexão. Verifique sua internet.');
            setErrorDetails({
              type: 'NETWORK_ERROR',
              errorName: e.name,
              errorMessage: e.message,
              errorStack: e.stack,
              qrToken: decodedText,
              timestamp: new Date().toISOString()
            });
            playErrorSound();
          } finally {
            setLoading(false);
          }
        }

        function onScanError(error) {
          // Ignora erros de leitura frame a frame (normal durante scanning)
          if (error.includes('NotFoundException')) return;
          debug.warn('Scan error', { error });
        }

        scanner.render(onScanSuccess, onScanError);
        setIsScanning(true);
        debug.success('Scanner iniciado');
      } catch (error) {
        debug.error('Erro ao iniciar scanner', { message: error.message });
        setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    };

    initScanner();

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => 
          console.error("Failed to clear scanner", error)
        );
        scannerRef.current = null;
      }
    };
  }, [isScanning, scanResult, loading]);

  const playSuccessSound = () => {
    try {
      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(() => {}); // Ignora se não tiver o arquivo
    } catch (e) {}
  };

  const playErrorSound = () => {
    try {
      const audio = new Audio('/sounds/error.mp3');
      audio.play().catch(() => {}); // Ignora se não tiver o arquivo
    } catch (e) {}
  };

  const resetScanner = () => {
    debug.log('Resetando scanner...');
    setScanResult(null);
    setMessage('');
    setIsScanning(false);
    setCameraError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    
    // Limpa o scanner atual
    if (scannerRef.current) {
      scannerRef.current.clear().catch(error => 
        debug.warn("Erro ao limpar scanner", { error: error.message })
      );
      scannerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header com Instruções */}
      {!scanResult && !cameraError && (
        <div className="bg-white border-b border-gray-200 p-4 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Scanner de Ingressos
          </h2>
          <p className="text-sm text-gray-600">
            📱 Aponte a câmera para o QR Code do ingresso
          </p>
        </div>
      )}

      {/* Erro de Câmera */}
      {cameraError && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 max-w-md w-full text-center">
            <div className="text-5xl mb-4">📷</div>
            <h3 className="text-lg font-bold text-red-800 mb-2">
              Câmera Indisponível
            </h3>
            <p className="text-red-700 mb-4">{cameraError}</p>
            <p className="text-sm text-red-600 mb-4">
              Verifique se você permitiu o acesso à câmera no seu navegador.
            </p>
            <button 
              onClick={() => {
                setCameraError(null);
                setIsScanning(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg w-full"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Área da Câmera */}
      {!scanResult && !cameraError && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div id="reader" className="rounded-lg overflow-hidden shadow-lg"></div>
            
            {/* Loading durante validação */}
            {loading && (
              <div className="mt-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-blue-800 font-bold text-lg">Validando ingresso...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback de Sucesso */}
      {scanResult === 'success' && (
        <div className="flex-1 flex items-center justify-center p-6 bg-green-50">
          <div className="bg-white border-4 border-green-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-7xl mb-4 animate-bounce">✅</div>
            <h3 className="text-3xl font-bold text-green-700 mb-4">
              INGRESSO VÁLIDO!
            </h3>
            <div className="bg-green-100 rounded-lg p-4 mb-6">
              <p className="text-xl font-semibold text-green-900">{message}</p>
            </div>
            <button 
              onClick={resetScanner}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl w-full text-lg shadow-lg transform transition hover:scale-105"
            >
              Próximo Ingresso →
            </button>
          </div>
        </div>
      )}

      {/* Feedback de Erro */}
      {scanResult === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-red-50 overflow-auto">
          <div className="bg-white border-4 border-red-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-7xl mb-4">❌</div>
            <h3 className="text-3xl font-bold text-red-700 mb-4">
              INGRESSO INVÁLIDO
            </h3>
            <div className="bg-red-100 rounded-lg p-4 mb-4">
              <p className="text-lg font-semibold text-red-900">{message}</p>
            </div>
            
            {/* Botão para ver detalhes do erro */}
            {errorDetails && (
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-sm text-red-600 underline mb-4 hover:text-red-800"
              >
                {showErrorDetails ? '🔼 Ocultar detalhes técnicos' : '🔽 Ver detalhes técnicos'}
              </button>
            )}
            
            {/* Painel expansível com detalhes do erro */}
            {showErrorDetails && errorDetails && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6 text-left overflow-auto max-h-64">
                <p className="text-xs text-gray-400 mb-2 font-mono">DEBUG INFO:</p>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
                    alert('Detalhes copiados!');
                  }}
                  className="mt-3 text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded w-full"
                >
                  📋 Copiar Detalhes
                </button>
              </div>
            )}
            
            <button 
              onClick={resetScanner}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl w-full text-lg shadow-lg transform transition hover:scale-105"
            >
              Escanear Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}