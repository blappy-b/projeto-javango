-- Adiciona coluna image_url de volta à tabela events
-- Suporta tanto URLs externas quanto caminhos de arquivos locais

alter table public.events
  add column if not exists image_url text;

-- Adiciona comentário explicativo
comment on column public.events.image_url is 'URL da imagem do evento (pode ser URL externa ou caminho local em /public)';
