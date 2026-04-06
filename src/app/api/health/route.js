import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Health check endpoint para manter o Supabase ativo
 * 
 * Este endpoint faz uma query simples no banco para prevenir que o Supabase
 * entre em modo "pause" no plano gratuito devido à inatividade.
 * 
 * Use um serviço de cron externo (UptimeRobot, cron-job.org, etc.) para
 * fazer requisições regulares a este endpoint.
 */
export async function GET(request) {
  try {
    // Cria cliente Supabase com chave anônima (sem privilégios especiais)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Faz uma query simples e leve - apenas contagem de eventos
    const { data, error, count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("[Health Check] Erro ao consultar Supabase:", error);
      return NextResponse.json(
        {
          status: "error",
          message: "Falha ao conectar com o banco de dados",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Retorna resposta de sucesso
    return NextResponse.json({
      status: "ok",
      database: "connected",
      eventsCount: count || 0,
      timestamp: new Date().toISOString(),
      message: "Supabase está ativo e respondendo",
    });
  } catch (error) {
    console.error("[Health Check] Erro inesperado:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Erro interno no health check",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
