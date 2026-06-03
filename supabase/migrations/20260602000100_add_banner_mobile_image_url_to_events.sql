-- Adiciona coluna banner_mobile_image_url à tabela events
-- Essa imagem será exibida no banner/hero da página de detalhes em dispositivos móveis
-- Necessário porque a proporção do banner desktop não fica adequada em telas menores

alter table public.events
  add column if not exists banner_mobile_image_url text;

-- Adiciona comentário explicativo
comment on column public.events.banner_mobile_image_url is 'URL da imagem do banner do evento para dispositivos móveis';
