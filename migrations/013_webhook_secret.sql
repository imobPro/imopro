-- =============================================================================
-- ImobPro — Migration 013: Webhook secret por tenant
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Contexto (Etapa 2 da auditoria de segurança, achados #1 e #2):
--
-- O modelo anterior (Sprint 9.6) autenticava /webhook/whatsapp e
-- /webhook/zapi-status por "posse do instanceId" — quem descobrisse o
-- zapi_instance_id de um tenant podia injetar mensagens falsas, forçar o
-- ConnectedCallback (queimando o trial de 7 dias) e disparar respostas
-- pagas na Claude API. O instanceId nunca foi um segredo por design: fica
-- em cleartext no DB, aparece em painéis e URLs, e é imutável.
--
-- A Z-API não oferece HMAC nem assinatura nos webhooks inbound (confirmado
-- em developer.z-api.io — o Client-Token só protege chamadas outbound do
-- backend para a Z-API). A defesa possível é um token secreto por tenant no
-- path da URL de callback, rotacionável e nunca reutilizado como identificador.
--
-- Esta migration adiciona a coluna, gera secret para tenants existentes
-- (backfill via gen_random_bytes) e marca como NOT NULL. O deploy do código
-- que USA esse secret vem depois — enquanto os tenants existentes não
-- apontarem os callbacks da Z-API para a nova URL (via /update-every-webhooks
-- na Partner API), o webhook antigo /webhook/whatsapp continua respondendo
-- (comportamento controlado no router, não aqui).
-- =============================================================================

-- pgcrypto é o que fornece gen_random_bytes. O Supabase já traz habilitado
-- por padrão, mas garantir aqui torna a migration idempotente em qualquer
-- projeto novo.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Coluna nullable primeiro — permite backfill sem violar constraint.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS webhook_secret text;

-- 2. Backfill dos tenants existentes que ainda não têm secret.
--    32 bytes aleatórios em hex = 64 chars. Espaço de busca 2^256 — infactível
--    de força bruta e sem colisão prática.
UPDATE tenants
   SET webhook_secret = encode(gen_random_bytes(32), 'hex')
 WHERE webhook_secret IS NULL;

-- 3. Agora sim NOT NULL + UNIQUE. UNIQUE dá índice automático — o middleware
--    faz lookup por webhook_secret e precisa ser rápido.
ALTER TABLE tenants
  ALTER COLUMN webhook_secret SET NOT NULL;

ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_webhook_secret_unique;
ALTER TABLE tenants
  ADD  CONSTRAINT tenants_webhook_secret_unique UNIQUE (webhook_secret);

COMMENT ON COLUMN tenants.webhook_secret IS
  'Secret por tenant, gerado no provisionamento e passado no path dos webhooks Z-API (/webhook/whatsapp/:secret e /webhook/zapi-status/:secret). Rotacionável: UPDATE + reapontar callbacks via Z-API /update-every-webhooks.';
