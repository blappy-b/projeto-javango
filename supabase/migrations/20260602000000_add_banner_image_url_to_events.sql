-- Adiciona coluna banner_image_url à tabela events
-- Essa imagem será exibida no banner/hero da página de detalhes do evento
-- A coluna image_url existente continua sendo usada para a listagem de eventos

alter table public.events
  add column if not exists banner_image_url text;

-- Adiciona comentário explicativo
comment on column public.events.banner_image_url is 'URL da imagem do banner do evento (exibida na página de detalhes)';
