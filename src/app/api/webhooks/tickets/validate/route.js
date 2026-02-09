import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Use o client server-side
import { verifyTicketHash } from '@/lib/security';

// Inicializa Supabase (Admin para poder escrever/ler tudo)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export async function POST(req) {
  try {
    const { qrToken, staffId } = await req.json();

    // 1. Validar Assinatura Criptográfica
    const payload = verifyTicketHash(qrToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'QR CODE FALSO OU INVÁLIDO' }, { status: 400 });
    }

    // 2. Buscar no Banco de Dados
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, events(title)')
      .eq('id', payload.tid)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ success: false, message: 'Ingresso não encontrado no sistema' }, { status: 404 });
    }

    // 3. Regras de Negócio
    if (ticket.status === 'used') {
      return NextResponse.json({ 
        success: false, 
        message: `JÁ UTILIZADO em ${new Date(ticket.validated_at).toLocaleTimeString()}`,
        code: 'ALREADY_USED'
      }, { status: 409 });
    }

    if (ticket.status === 'cancelled') {
      return NextResponse.json({ success: false, message: 'Ingresso CANCELADO' }, { status: 403 });
    }

    // 4. Validar (Atualizar banco)
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: 'used', 
        validated_at: new Date().toISOString(),
        validated_by: staffId 
      })
      .eq('id', ticket.id);

    if (updateError) throw updateError;

    // 5. Retorno de Sucesso
    return NextResponse.json({
      success: true,
      data: {
        owner: ticket.owner_name,
        event: ticket.events.title,
        type: ticket.batch_name // ex: Lote VIP
      }
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Erro interno no servidor' }, { status: 500 });
  }
}