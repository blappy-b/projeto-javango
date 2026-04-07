'use client';
import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { createSupabaseBrowser } from '@/lib/supabase';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null); // null, success, error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Configuração da Lib
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    async function onScanSuccess(decodedText) {
      scanner.pause(); // Pausa para não ler o mesmo 10 vezes
      setLoading(true);

      try {
        const supabase = createSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        // Chama nossa API
        const res = await fetch('/api/tickets/validate', {
          method: 'POST',
          body: JSON.stringify({ qrToken: decodedText }),
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (res.ok) {
          setScanResult('success');
          setMessage(`BEM-VINDO: ${data.data.owner} (${data.data.type})`);
          // Toca som de sucesso aqui
        } else {
          setScanResult('error');
          setMessage(data.message);
          // Toca som de erro aqui
        }
      } catch (e) {
        setScanResult('error');
        setMessage('Erro de conexão');
      } finally {
        setLoading(false);
      }
    }

    scanner.render(onScanSuccess, (error) => { 
      // Ignora erros de leitura frame a frame 
    });

    // Cleanup
    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  const resetScanner = () => {
    setScanResult(null);
    setMessage('');
    // A lib html5-qrcode precisa de um resume manual ou reload dependendo da implementação
    window.location.reload(); // Solução simples para MVP
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Área da Câmera */}
      {!scanResult && <div id="reader" className="w-full max-w-sm"></div>}

      {/* Loading */}
      {loading && <p className="text-red-primary font-bold mt-4">Validando...</p>}

      {/* Feedback Visual - Tela Cheia ou Card Grande */}
      {scanResult === 'success' && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-8 w-full text-center">
          <p className="font-bold text-2xl">VALIDADO!</p>
          <p className="text-xl mt-2">{message}</p>
          <button onClick={resetScanner} className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg w-full">
            Próximo
          </button>
        </div>
      )}

      {scanResult === 'error' && (
        <div className="bg-red-primary border-l-4 border-red-primary p-8 w-full text-center">
          <p className="font-bold text-2xl">ERRO 🛑</p>
          <p className="text-xl mt-2">{message}</p>
          <button onClick={resetScanner} className="mt-6 bg-red-primary text-white px-6 py-3 rounded-lg w-full">
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}