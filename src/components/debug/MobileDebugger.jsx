"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { X, Bug, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

// Context para compartilhar logs entre componentes
const DebugContext = createContext(null);

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    // Se não estiver dentro do provider, retorna funções vazias
    return {
      log: () => {},
      warn: () => {},
      error: () => {},
      success: () => {},
    };
  }
  return context;
}

export function DebugProvider({ children, enabled = true }) {
  const [logs, setLogs] = useState([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isVisible, setIsVisible] = useState(enabled);

  // Função auxiliar para adicionar log
  const addLog = (type, message, data = null) => {
    const entry = {
      id: Date.now() + Math.random(),
      type,
      message,
      data: data ? JSON.stringify(data, null, 2) : null,
      time: new Date().toLocaleTimeString("pt-BR"),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 50)); // Mantém últimos 50 logs
    
    // Auto-abre se for erro
    if (type === "error") {
      setIsMinimized(false);
    }
  };

  const debug = {
    log: (msg, data) => addLog("info", msg, data),
    warn: (msg, data) => addLog("warn", msg, data),
    error: (msg, data) => addLog("error", msg, data),
    success: (msg, data) => addLog("success", msg, data),
  };

  const clearLogs = () => setLogs([]);

  // Também captura erros não tratados
  useEffect(() => {
    if (!enabled) return;

    const handleError = (event) => {
      addLog("error", `[Uncaught] ${event.message}`, {
        file: event.filename,
        line: event.lineno,
      });
    };

    const handleRejection = (event) => {
      addLog("error", `[Promise] ${event.reason?.message || event.reason}`);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [enabled]);

  if (!isVisible) {
    return (
      <DebugContext.Provider value={debug}>
        {children}
      </DebugContext.Provider>
    );
  }

  const errorCount = logs.filter((l) => l.type === "error").length;
  const warnCount = logs.filter((l) => l.type === "warn").length;

  return (
    <DebugContext.Provider value={debug}>
      {children}
      
      {/* Debug Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
        <div className="pointer-events-auto">
          {/* Toggle Button */}
          <div className="flex justify-end p-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shadow-lg ${
                errorCount > 0
                  ? "bg-red-600 text-white"
                  : warnCount > 0
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-800 text-white"
              }`}
            >
              <Bug className="w-4 h-4" />
              {logs.length > 0 && (
                <span>
                  {errorCount > 0 && `${errorCount}E `}
                  {warnCount > 0 && `${warnCount}W `}
                  ({logs.length})
                </span>
              )}
              {isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Log Panel */}
          {!isMinimized && (
            <div className="bg-gray-900 border-t border-gray-700 max-h-[50vh] overflow-hidden flex flex-col">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800">
                <span className="text-sm font-medium text-white">
                  Debug Logs ({logs.length})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearLogs}
                    className="text-gray-400 hover:text-white p-1"
                    title="Limpar logs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-white p-1"
                    title="Fechar debugger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Log List */}
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhum log ainda
                  </p>
                ) : (
                  logs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DebugContext.Provider>
  );
}

function LogEntry({ log }) {
  const [expanded, setExpanded] = useState(false);

  const colors = {
    info: "border-blue-500 bg-blue-900/30",
    warn: "border-yellow-500 bg-yellow-900/30",
    error: "border-red-500 bg-red-900/30",
    success: "border-green-500 bg-green-900/30",
  };

  const textColors = {
    info: "text-blue-300",
    warn: "text-yellow-300",
    error: "text-red-300",
    success: "text-green-300",
  };

  return (
    <div
      className={`border-l-4 rounded-r px-2 py-1 ${colors[log.type]}`}
      onClick={() => log.data && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-gray-500 text-xs shrink-0">{log.time}</span>
        <span className={`text-sm break-all ${textColors[log.type]}`}>
          {log.message}
        </span>
      </div>
      {log.data && expanded && (
        <pre className="text-xs text-gray-400 mt-1 overflow-x-auto bg-black/30 p-2 rounded">
          {log.data}
        </pre>
      )}
    </div>
  );
}

export default DebugProvider;
