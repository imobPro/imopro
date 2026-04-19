-- =============================================================================
-- ImobPro — Migration 002: Coluna de sentimento na tabela conversations
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS sentiment text DEFAULT 'neutro'
    CHECK (sentiment IN ('positivo', 'neutro', 'negativo')),
  ADD COLUMN IF NOT EXISTS sentiment_updated_at timestamptz;

-- Índice parcial para o painel consultar rapidamente conversas negativas
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment
  ON conversations(tenant_id, sentiment)
  WHERE sentiment = 'negativo';
